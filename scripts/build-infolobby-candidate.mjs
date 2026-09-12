import { createReadStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { join, resolve } from "node:path";
import { fetchInfoLobby } from "../../cambiometro-public/transparencia-app/scripts/etl/connectors/cplt.mjs";
import { buildLakePlan } from "../../cambiometro-public/transparencia-app/scripts/etl/lake.mjs";

const tempRoot = resolve(process.env.INFLOBBY_CANDIDATE_ROOT ?? "C:/Users/jorge/AppData/Local/Temp/infolobby-reconcile-20260912");
const outputRoot = resolve(process.env.INFLOBBY_CANDIDATE_OUTPUT ?? join(tempRoot, "candidate-release"));
const catalogPath = join(tempRoot, "..", "phase567-audit-20260912", "catalog_v1_manifest.json");
const oldFiles = [
  "partitions_infolobby_2026_01_records-5833c6eec7ea92b0a7a9ec9e04368dc9f4d6ed5ba1e525d8590e2c0d558eeb8a.jsonl.gz",
  "partitions_infolobby_2026_02_records-2652d4323281c729d6c5292c3a444eacd7af18ca4d048e05ddd7c3b0c0d6a528.jsonl.gz",
  "partitions_infolobby_2026_03_records-e2e448f92374207e5f5a993ba1b3ba4d5e585e2949adbf88e7a827f1c8ef6821.jsonl.gz",
  "partitions_infolobby_2026_04_records-3803c6766b70eec72341b96a0e26af0ad3550aef8dc9f1542130574f6acccb79.jsonl.gz",
  "partitions_infolobby_2026_05_records-03dc57c736590f5001ba1971973c0c2f0fbdc38853a03f663a70a45172a94f56.jsonl.gz",
  "partitions_infolobby_2026_06_records-444ab9b2b7be6a5f0c43aabc500837551a06a2203fdfd8fa719d29c7360a6769.jsonl.gz",
  "partitions_infolobby_2026_07_records-0f938a595949dbf99cf160cf56aadc3ad15b7ada33a58ac07e1241843227f92a.jsonl.gz",
];

async function readJsonlGzip(path) {
  const rows = [];
  const lines = createInterface({ input: createReadStream(path).pipe(createGunzip()) });
  for await (const line of lines) if (line.trim()) rows.push(JSON.parse(line).data);
  return rows;
}

const previous = (JSON.parse(readFileSync(catalogPath, "utf8")).partitions ?? [])
  .filter((partition) => partition.sourceId === "infolobby");
const historic = [];
for (const file of oldFiles) historic.push(...await readJsonlGzip(join(tempRoot, file)));
const august = await fetchInfoLobby({ from: "2026-08-01", to: "2026-08-31", timeoutMs: 180_000, retries: 1, retryDelayMs: 500, datasetConcurrency: 2 });
const mergedById = new Map(historic.map((row) => [String(row.id ?? ""), row]));
for (const row of august) mergedById.set(String(row.id ?? ""), row);
const all = [...mergedById.values()];
const ids = all.map((row) => String(row.id ?? ""));

const existingCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const plan = buildLakePlan({ actualizado_en: "2026-09-12T10:00:00.000Z", fuentes: { infolobby: all } }, { existingCatalog: { ...existingCatalog, partitions: previous, sources: existingCatalog.sources.filter((source) => source.id === "infolobby") } });
mkdirSync(outputRoot, { recursive: true });
for (const item of plan.assets) {
  const target = join(outputRoot, item.key);
  mkdirSync(resolve(target, ".."), { recursive: true });
  writeFileSync(target, item.data);
}
writeFileSync(join(outputRoot, "catalog.json"), `${JSON.stringify(plan.catalog, null, 2)}\n`);
const source = plan.catalog.sources.find((item) => item.id === "infolobby");
console.log(JSON.stringify({
  historicRows: historic.length,
  augustRows: august.length,
  candidateRows: all.length,
  candidateUniqueIds: new Set(ids).size,
  candidatePartitions: plan.catalog.partitions.filter((item) => item.sourceId === "infolobby").map((item) => ({ period: item.period, rows: item.recordCount, checksumSha256: item.checksumSha256 })),
  entityCount: source?.entityCount ?? null,
  assets: plan.assets.length,
  bytes: plan.assets.reduce((sum, item) => sum + item.size, 0),
  outputRoot,
}, null, 2));
