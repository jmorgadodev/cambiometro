import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sourceHealthRaw from "@/data/etl/source-health.json";
import movementsRaw from "@/data/movimientos.json";
import globalKpisRaw from "@/lib/global-kpis.json";
import { buildLandingSummary, type LandingSummary, sourceKeyForHomeSource } from "@/lib/landing-summary";
import { getTransferReleaseMetadata } from "@/lib/transfer-release-metadata";

export { sourceKeyForHomeSource };

function readGeneratedSummary(): LandingSummary | null {
  const path = join(process.cwd(), "data", "generated", "landing-summary.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as LandingSummary;
  } catch {
    return null;
  }
}

export function getLandingSummary(): LandingSummary {
  return readGeneratedSummary() ?? buildLandingSummary({
    sourceHealth: sourceHealthRaw,
    movements: movementsRaw,
    globalKpis: globalKpisRaw,
    transferRelease: getTransferReleaseMetadata(),
  });
}
