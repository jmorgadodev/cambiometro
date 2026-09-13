import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SourceManifest } from "@/lib/data-contracts";
import { listSourceManifests } from "@/lib/data-platform-d1";
import { mergeR2Catalog, type R2PublicCatalog } from "@/lib/r2-catalog";
import { getTransferReleaseMetadata } from "@/lib/transfer-release-metadata";
import { getDataQualityConfig } from "@/lib/data-quality-summary";

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

// Compatibility exports: these remain the configured historical references.
// Current canonical counts are taken from the release catalog below whenever
// it contains a validated count, so a stale config cannot hide a newer R2 cut.
export const SOURCE_CANONICAL_COUNTS: Record<string, number> = Object.fromEntries(
  getDataQualityConfig().map((source) => [source.id, source.canonicalCount]),
);

export const SOURCE_HISTORICAL_COUNTS: Record<string, number> = Object.fromEntries(
  getDataQualityConfig().map((source) => [source.id, source.historicalCount]),
);

export async function listPublishedSourceManifests(): Promise<SourceManifest[]> {
  const base = await listSourceManifests();
  const catalog = localR2Catalog();
  const cplt = localCpltManifest();
  const merged = mergeCpltCatalog(mergeR2Catalog(base, catalog), cplt);
  const transferRelease = getTransferReleaseMetadata();
  return merged.map((source) => ({
    ...source,
    // R2/D1 manifests are the release evidence. The checked-in configuration
    // is only a fallback for sources without a published count in this build.
    canonicalCount: source.id === "ley-19862"
      ? transferRelease.totalRows
      : Number.isSafeInteger(source.recordCount) && source.recordCount > 0
        ? source.recordCount
        : SOURCE_CANONICAL_COUNTS[source.id] ?? source.recordCount,
    historicalCount: source.id === "ley-19862"
      ? transferRelease.totalRows
      : SOURCE_HISTORICAL_COUNTS[source.id] ?? source.recordCount,
    lastUpdated: source.id === "ley-19862" ? transferRelease.generatedAt ?? source.lastUpdated : source.lastUpdated,
  }));
}
