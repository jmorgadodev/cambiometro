import type { LakeAsset } from "./lake.mjs";
export interface R2Inventory { objects: Array<{ key: string; size: number; checksumSha256: string }>; }
export function selectHotAssets(assets: LakeAsset[]): LakeAsset[];
export function planR2Publication(assets: LakeAsset[], previousInventory?: R2Inventory, limitBytes?: number): {
  action: "publish" | "archive_cold_partitions";
  limitBytes: number;
  previousBytes: number;
  projectedBytes: number;
  ratio: number;
  puts: LakeAsset[];
  deletes: string[];
  inventory: R2Inventory & { schemaVersion: string; limitBytes: number; usedBytes: number };
};
