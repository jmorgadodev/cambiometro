import { readFileSync, writeFileSync } from "node:fs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const catalogPath = argument("--catalog");
const stagedPath = argument("--staged");
const outputPath = argument("--output");
if (!catalogPath || !stagedPath || !outputPath) throw new Error("CAMARA_PREFLIGHT_ARGS_REQUIRED");

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const staged = JSON.parse(readFileSync(stagedPath, "utf8"));
if (staged.variant !== "asistencia_camara" || staged.period !== "2026-09") throw new Error("CAMARA_PREFLIGHT_SCOPE_INVALID");
if (staged.recordCount !== 775 || staged.partitions?.length !== 1) throw new Error(`CAMARA_PREFLIGHT_COUNT_INVALID:${staged.recordCount}`);

const newPartitions = staged.partitions;
const replacementIds = new Set(newPartitions.map((partition) => partition.id));
const oldPartitions = Array.isArray(catalog.partitions) ? catalog.partitions : [];
if (!oldPartitions.some((partition) => replacementIds.has(partition.id))) throw new Error("CAMARA_PREFLIGHT_PARTITION_NOT_DECLARED");
const partitions = [...oldPartitions.filter((partition) => !replacementIds.has(partition.id)), ...newPartitions]
  .sort((left, right) => left.id.localeCompare(right.id));
const sources = (catalog.sources ?? []).map((source) => {
  if (source.id !== "camara") return source;
  const own = partitions.filter((partition) => partition.sourceId === "camara");
  return {
    ...source,
    status: "partial",
    foundPeriods: [...new Set([...source.foundPeriods ?? [], ...own.map((partition) => partition.period)])].sort(),
    recordCount: own.reduce((total, partition) => total + Number(partition.recordCount ?? 0), 0),
  };
});
const merged = { ...catalog, generatedAt: staged.generatedAt, sources, partitions };
writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ oldPartitions: oldPartitions.length, newPartitions: partitions.length, replaced: [...replacementIds], camaraRecordCount: sources.find((source) => source.id === "camara")?.recordCount }, null, 2));
