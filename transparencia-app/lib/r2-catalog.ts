import type { SourceManifest } from "@/lib/data-contracts";

export interface R2PublicCatalog {
  schemaVersion: string;
  generatedAt: string | null;
  sources: Array<{ id: string; status: SourceManifest["status"]; foundPeriods: string[]; recordCount: number }>;
  partitions: Array<{ id: string; sourceId: string; period: string; manifestKey: string; checksumSha256: string; releaseTag?: string; status: SourceManifest["status"] }>;
}

export function mergeR2Catalog(manifests: SourceManifest[], catalog: R2PublicCatalog | null): SourceManifest[] {
  if (!catalog) return manifests;
  const byId = new Map(catalog.sources.map((source) => [source.id, source]));
  return manifests.map((manifest) => {
    const current = byId.get(manifest.id);
    if (!current) return manifest;
    const latestPartition = catalog.partitions
      .filter((partition) => partition.sourceId === manifest.id)
      .sort((a, b) => b.period.localeCompare(a.period))[0];
    return {
      ...manifest,
      foundPeriods: current.foundPeriods,
      lastUpdated: catalog.generatedAt,
      checksumSha256: latestPartition?.checksumSha256 ?? null,
      // El inventario representa datos validados en cualquiera de las dos
      // capas. D1 conserva la porción consultable y R2 el histórico completo.
      recordCount: Math.max(manifest.recordCount, current.recordCount),
      status: Math.max(manifest.recordCount, current.recordCount) > 0 ? current.status : manifest.status,
      statusDetail: Math.max(manifest.recordCount, current.recordCount) === 0
        ? "Sin lote validado disponible; la fuente no se anuncia como cargada."
        : manifest.storageTier === "r2"
        ? "Histórico íntegro en R2 y disponible bajo demanda; D1 conserva el conjunto operativo."
        : manifest.recordCount > 0
          ? "Datos consultables en D1; R2 conserva los artefactos versionados y su trazabilidad."
          : "Lote validado en R2; su materialización consultable en D1 está pendiente.",
    };
  });
}
