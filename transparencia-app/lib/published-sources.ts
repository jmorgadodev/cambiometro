import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SourceManifest } from "@/lib/data-contracts";
import { listSourceManifests } from "@/lib/data-platform-d1";
import { mergeR2Catalog, type R2PublicCatalog } from "@/lib/r2-catalog";

export interface CpltPublicManifest {
  sourceId: "transparencia-activa";
  generatedAt: string;
  recordCount: number;
  version: string;
}

export function mergeCpltCatalog(
  manifests: SourceManifest[],
  cplt: CpltPublicManifest | null,
): SourceManifest[] {
  if (!cplt || !Number.isSafeInteger(cplt.recordCount) || cplt.recordCount < 1) return manifests;
  return manifests.map((manifest) => manifest.id === cplt.sourceId ? {
    ...manifest,
    recordCount: Math.max(manifest.recordCount, cplt.recordCount),
    status: "partial",
    storageTier: "r2",
    lastUpdated: cplt.generatedAt,
    statusDetail: "Nómina nacional validada y versionada en R2; D1 conserva metadatos, cobertura y consultas operativas.",
  } : manifest);
}

function localR2Catalog(): R2PublicCatalog | null {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "data", "lake", "catalog", "v1", "manifest.json"), "utf8")) as R2PublicCatalog;
  } catch {
    return null;
  }
}

function localCpltManifest(): CpltPublicManifest | null {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "data", "lake-cplt", "projections", "funcionarios-v1", "manifest.json"), "utf8")) as CpltPublicManifest;
  } catch {
    return null;
  }
}

export async function listPublishedSourceManifests(): Promise<SourceManifest[]> {
  const base = await listSourceManifests();
  const catalog: R2PublicCatalog | null = localR2Catalog();
  const cplt: CpltPublicManifest | null = localCpltManifest();
  return mergeCpltCatalog(mergeR2Catalog(base, catalog), cplt);
}
