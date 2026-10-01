import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { assertReleaseCandidate } from "./release-candidate.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const catalogPath = argument("--catalog");
const stagedPath = argument("--staged");
const outputPath = argument("--output");
if (!catalogPath || !stagedPath || !outputPath) throw new Error("CAMARA_PREFLIGHT_ARGS_REQUIRED");
const variant = argument("--variant") ?? "asistencia_camara";
const period = argument("--period") ?? "2026-09";
const expectedCount = Number(argument("--expected-count") ?? (variant === "asistencia_camara" ? 775 : 155));

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const staged = JSON.parse(readFileSync(stagedPath, "utf8"));
if (staged.variant !== variant || staged.period !== period) throw new Error(`CAMARA_PREFLIGHT_SCOPE_INVALID:${staged.variant}:${staged.period}`);
if (staged.recordCount !== expectedCount || staged.partitions?.length !== 1) throw new Error(`CAMARA_PREFLIGHT_COUNT_INVALID:${staged.recordCount}:${expectedCount}`);

const newPartitions = staged.partitions;
const replacementIds = new Set(newPartitions.map((partition) => partition.id));
const oldPartitions = Array.isArray(catalog.partitions) ? catalog.partitions : [];
if (!oldPartitions.some((partition) => replacementIds.has(partition.id))) throw new Error("CAMARA_PREFLIGHT_PARTITION_NOT_DECLARED");
const partition = newPartitions[0];
const partitionId = `camara/${variant}/${period.replace("-", "/")}`;
const prefix = `partitions/${partitionId}/`;
if (partition.id !== partitionId || partition.sourceId !== "camara" || partition.variant !== variant || partition.period !== period
  || partition.recordCount !== staged.recordCount) throw new Error("CAMARA_PREFLIGHT_PARTITION_SCOPE_INVALID");
if (!Array.isArray(staged.assets) || staged.assets.length < 3
  || new Set(staged.assets.map((asset) => asset.key)).size !== staged.assets.length) throw new Error("CAMARA_PREFLIGHT_ASSETS_INCOMPLETE");
const recordAssets = [];
for (const asset of staged.assets) {
  if (typeof asset.key !== "string" || !asset.key.startsWith(prefix) || asset.key.includes("\\") || asset.key.split("/").includes("..")) throw new Error("CAMARA_PREFLIGHT_ASSET_SCOPE_INVALID");
  const bytes = readFileSync(resolve(dirname(stagedPath), asset.key));
  const checksum = createHash("sha256").update(bytes).digest("hex");
  if (bytes.length !== asset.size || checksum !== asset.checksumSha256) throw new Error(`CAMARA_PREFLIGHT_ASSET_INVALID:${asset.key}`);
  if (asset.key.endsWith(".jsonl.gz")) recordAssets.push({ bytes, checksum });
}
// These small, isolated repair candidates must fit one validated partition.
if (recordAssets.length !== 1 || !staged.assets.some((asset) => asset.key === partition.manifestKey)
  || !staged.assets.some((asset) => asset.key === `${prefix}sha256.txt`)) throw new Error("CAMARA_PREFLIGHT_ASSETS_INCOMPLETE");
const records = gunzipSync(recordAssets[0].bytes).toString("utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
const kind = { asistencia_camara: "attendance", votaciones_camara: "vote", congreso_opendata: "authority" }[variant];
if (!kind || records.some((record) => record.sourceId !== "camara" || record.kind !== kind || record.data?.source_period !== period)) throw new Error("CAMARA_PREFLIGHT_RECORD_SCOPE_INVALID");
assertReleaseCandidate({
  sourceId: staged.sourceId, expectedSourceId: "camara", complete: true,
  periods: records.map((record) => record.data.source_period), expectedPeriods: [period],
  records, recordCount: staged.recordCount,
  checksumSha256: partition.checksumSha256, actualChecksumSha256: recordAssets[0].checksum,
  previous: oldPartitions.find((entry) => entry.id === partitionId),
});
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
