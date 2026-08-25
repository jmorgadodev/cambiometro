export interface LakeAsset {
  key: string;
  data: Buffer;
  checksumSha256: string;
  size: number;
  releaseTag: string;
  releaseAssetName: string;
}
export interface LakeCatalogPartition {
  id: string;
  sourceId: string;
  period: string;
  sourcePeriod?: string | null;
  releaseTag: string;
  manifestKey: string;
  recordCount: number;
  checksumSha256: string;
  status: string;
}
export interface LakeCatalogSource {
  id: string;
  status: string;
  foundPeriods: string[];
  recordCount: number;
  discoveredAssetCount: number;
  indexChecksumSha256: string | null;
  error: string | null;
}
export function buildLakePlan(snapshot: {
  actualizado_en?: string;
  fuentes: Record<string, Array<Record<string, unknown> & { id: string; fecha?: string; source_period?: string; url?: string }>>;
}, options?: { maxPartBytes?: number; sourceInventory?: { generatedAt?: string; sources?: Array<Record<string, unknown>> } | null; sourceMetadata?: Record<string, { coverage?: Record<string, unknown>; license?: string; notes?: string }>; existingCatalog?: { partitions?: Array<Record<string, unknown> & { id: string; sourceId: string; period: string; sourcePeriod?: string | null; recordCount: number }>; sources?: Array<Record<string, unknown> & { id: string }> } | null; existingEntityBundles?: Record<string, { entities?: Array<Record<string, unknown>>; indexes?: Array<Record<string, unknown>>; years?: string[] }>; replaceSourceIds?: string[]; originalAssets?: Array<{ sourceId: string; year: number; month: number; name: string; url: string; data?: Buffer; checksumSha256?: string; size?: number; license: string; redistributable: boolean }> }): {
  catalog: { schemaVersion: string; generatedAt: string | null; sources: LakeCatalogSource[]; partitions: LakeCatalogPartition[] };
  assets: LakeAsset[];
};
