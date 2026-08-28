import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { buildLey19862Projection } from "./etl/ley19862-projection.mjs";
import { assertCanonicalTransferRelease } from "./etl/transfer-release-guard.mjs";

const root = resolve(import.meta.dirname, "..");
const sourceRoot = join(root, "data", "lake", "partitions", "ley-19862");
const output = join(root, "data", "lake", "projections", "v1", "ley19862-summary.json");
const registeredThrough = process.env.TRANSFER_RELEASE_REGISTERED_THROUGH
  ?? process.env.LEY_19862_REGISTERED_THROUGH
  ?? null;

async function readPartition(file) {
  const records = [];
  const input = createReadStream(file).pipe(createGunzip());
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (line.trim()) records.push(JSON.parse(line));
  }
  return records;
}

if (!existsSync(sourceRoot)) throw new Error(`LEY_19862_SOURCE_MISSING: ${sourceRoot}`);
const files = [];
for (const year of (await readdir(sourceRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory())) {
  const yearRoot = join(sourceRoot, year.name);
  for (const month of (await readdir(yearRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory())) {
    const monthRoot = join(yearRoot, month.name);
    const manifest = JSON.parse(readFileSync(join(monthRoot, "manifest.json"), "utf8"));
    const artifact = manifest.artifacts?.find((item) => item.key?.endsWith(".jsonl.gz"));
    if (!artifact) throw new Error(`LEY_19862_PARTITION_MISSING: ${year.name}-${month.name}`);
    files.push({ period: `${year.name}-${month.name}`, file: join(root, "data", "lake", artifact.key) });
  }
}
files.sort((a, b) => a.period.localeCompare(b.period));
const records = [];
for (const item of files) records.push(...(await readPartition(item.file)));
const generatedAt = new Date(
  Math.max(...files.map((item) => new Date(JSON.parse(readFileSync(join(dirname(item.file), "manifest.json"), "utf8")).generatedAt).getTime())),
).toISOString();
// Monthly ingestion can overlap the last published period. One official folio
// is retained per stable ID, preferring the newest registration/event date;
// conflicting overlaps are counted in the manifest metadata.
const projection = buildLey19862Projection(records, { generatedAt, registeredThrough, dedupeById: true });
assertCanonicalTransferRelease({ totalRows: projection.kpis.total_transfers, totalMontoClp: projection.kpis.total_monto_clp });
projection.source.periods = files.map((item) => item.period);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(projection, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, periods: projection.source.periods, ...projection.kpis }, null, 2));
