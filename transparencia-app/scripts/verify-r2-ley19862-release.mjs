import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const lakeRoot = resolve(process.argv.includes("--lake") ? process.argv[process.argv.indexOf("--lake") + 1] : join(root, "data", "lake"));
const catalog = JSON.parse(readFileSync(join(lakeRoot, "catalog", "v1", "manifest.json"), "utf8"));
const source = catalog.sources?.find((candidate) => candidate.id === "ley-19862");
const allPartitions = (catalog.partitions ?? []).filter((partition) => partition.sourceId === "ley-19862");
const latestYear = allPartitions
  .map((partition) => Number(String(partition.id).split("/")[1]))
  .filter(Number.isInteger)
  .sort((left, right) => right - left)[0];
const partitions = allPartitions.filter((partition) => String(partition.id).split("/")[1] === String(latestYear));
if (!source || partitions.length === 0) throw new Error("R2_LEY19862_SOURCE_NOT_PUBLISHED");
const total = partitions.reduce((sum, partition) => sum + Number(partition.recordCount ?? 0), 0);
if (total !== source.recordCount) throw new Error(`R2_LEY19862_CATALOG_PARITY: ${total} != ${source.recordCount}`);
for (const partition of partitions) {
  if (!existsSync(join(lakeRoot, partition.manifestKey))) throw new Error(`R2_LEY19862_PARTITION_MANIFEST_MISSING: ${partition.id}`);
}
console.log(JSON.stringify({ source: source.id, status: source.status, year: latestYear, recordCount: source.recordCount, partitions: partitions.length, ignoredHistoricalPartitions: allPartitions.length - partitions.length, generatedAt: catalog.generatedAt }, null, 2));
