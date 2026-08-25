import { readFileSync } from "node:fs";
import { join } from "node:path";
import ley19862Subset from "@/data/lake-subsets/ley19862.subset.json";
import { getCloudflareContext } from "@opennextjs/cloudflare";
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

export const SOURCE_CANONICAL_COUNTS: Record<string, number> = {
  "chilecompra": 74142,
  "transparencia-activa": 1203287,
  "ley-19862": Number(ley19862Subset.kpis?.total_transfers ?? 59361),
  "dipres": 15689,
  "sinim": 3105,
  "infolobby": 60523,
  "infoprobidad": 15331,
  "contraloria": 291,
  "camara": 19025,
  "senado": 8138,
  "servel": 23894,
  "personal-apoyo": 4092,
  "ine-censo-2024": 346,
};

export const SOURCE_HISTORICAL_COUNTS: Record<string, number> = {
  "chilecompra": 888693,
  "transparencia-activa": 1218136,
  "ley-19862": 59361,
  "dipres": 15689,
  "sinim": 3105,
  "infolobby": 60523,
  "infoprobidad": 15331,
  "contraloria": 291,
  "camara": 19025,
  "senado": 8138,
  "servel": 23894,
  "personal-apoyo": 4092,
  "ine-censo-2024": 346,
};

export async function listPublishedSourceManifests(): Promise<SourceManifest[]> {
  const base = await listSourceManifests();
  let catalog: R2PublicCatalog | null = null;
  let cplt: CpltPublicManifest | null = null;
  try {
    const { env } = await getCloudflareContext({ async: true });
    const [catalogObject, cpltObject] = await Promise.all([
      env.PUBLIC_DATA?.get("catalog/v1/manifest.json"),
      env.PUBLIC_DATA?.get("projections/funcionarios-v1/manifest.json"),
    ]);
    catalog = catalogObject ? await catalogObject.json<R2PublicCatalog>() : null;
    cplt = cpltObject ? await cpltObject.json<CpltPublicManifest>() : null;
  } catch {
    // Next local no tiene bindings; se usan los últimos manifiestos validados.
  }
  catalog ??= localR2Catalog();
  cplt ??= localCpltManifest();
  const merged = mergeCpltCatalog(mergeR2Catalog(base, catalog), cplt);
  return merged.map((source) => ({
    ...source,
    canonicalCount: SOURCE_CANONICAL_COUNTS[source.id] ?? source.recordCount,
    historicalCount: SOURCE_HISTORICAL_COUNTS[source.id] ?? source.recordCount,
  }));
}
