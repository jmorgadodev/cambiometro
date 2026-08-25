import { createReadStream, existsSync, readFileSync, readdirSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { join } from "node:path";

const root = process.cwd();
const sourceRoot = join(root, "data", "lake", "partitions", "ley-19862");

function partitionFiles() {
  if (!existsSync(sourceRoot)) throw new Error(`LEY_19862_SOURCE_MISSING: ${sourceRoot}`);
  const files = [];
  for (const year of readdirSync(sourceRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const yearRoot = join(sourceRoot, year.name);
    for (const month of readdirSync(yearRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
      const monthRoot = join(yearRoot, month.name);
      const manifestPath = join(monthRoot, "manifest.json");
      if (!existsSync(manifestPath)) throw new Error(`LEY_19862_MANIFEST_MISSING: ${year.name}-${month.name}`);
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      const artifact = manifest.artifacts?.find((item) => item.key?.endsWith(".jsonl.gz"));
      if (!artifact) throw new Error(`LEY_19862_ARTIFACT_MISSING: ${year.name}-${month.name}`);
      const file = join(root, "data", "lake", artifact.key);
      if (!existsSync(file)) throw new Error(`LEY_19862_ARTIFACT_FILE_MISSING: ${file}`);
      files.push({ period: `${year.name}-${month.name}`, file, manifest });
    }
  }
  return files.sort((left, right) => left.period.localeCompare(right.period));
}

async function verify() {
  const files = partitionFiles();
  const ids = new Set();
  let rows = 0;
  let amount = 0;
  let manifestRows = 0;
  const periods = [];

  for (const partition of files) {
    let partitionRows = 0;
    const input = createReadStream(partition.file).pipe(createGunzip());
    const lines = createInterface({ input, crlfDelay: Infinity });
    for await (const line of lines) {
      if (!line.trim()) continue;
      const envelope = JSON.parse(line);
      const record = envelope?.data ?? envelope;
      const id = String(record?.id ?? "").trim();
      const value = record?.monto_clp;
      const url = String(record?.url ?? "");
      if (!id) throw new Error(`LEY_19862_ID_MISSING: ${partition.period}`);
      if (ids.has(id)) throw new Error(`LEY_19862_DUPLICATE_ID: ${id}`);
      if (!Number.isSafeInteger(value) || value < 0) throw new Error(`LEY_19862_AMOUNT_INVALID: ${id}`);
      if (!/^https:\/\/registros19862\.gob\.cl\//i.test(url)) throw new Error(`LEY_19862_URL_INVALID: ${id}`);
      ids.add(id);
      rows += 1;
      partitionRows += 1;
      amount += value;
    }
    const expectedRows = Number(partition.manifest.recordCount ?? -1);
    if (partitionRows !== expectedRows) {
      throw new Error(`LEY_19862_PARTITION_COUNT_MISMATCH: ${partition.period}=${partitionRows}/${expectedRows}`);
    }
    manifestRows += expectedRows;
    periods.push({ period: partition.period, rows: partitionRows });
  }

  if (rows === 0) throw new Error("LEY_19862_EMPTY_SOURCE");
  if (manifestRows !== rows) throw new Error(`LEY_19862_MANIFEST_COUNT_MISMATCH: ${manifestRows}/${rows}`);
  return { source: "ley-19862", rows, amount, periods, duplicateIds: 0, officialUrls: true };
}

try {
  const result = await verify();
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
