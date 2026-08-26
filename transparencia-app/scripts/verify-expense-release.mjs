import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildExpenseSubset, EXPENSE_SOURCES, readExpenseSubset } from "./expense-release.mjs";

const root = resolve(import.meta.dirname, "..");
const required = process.argv.includes("--required") || process.env.ALLOW_STATIC_SAMPLE !== "1";
const verifySlices = process.argv.includes("--verify-slices");
const slicesDir = join(root, "data", "politico-slices");

function fail(message) {
  throw new Error(`EXPENSE_RELEASE_INVALID: ${message}`);
}

const subsets = EXPENSE_SOURCES.map((sourceId) => {
  const subset = readExpenseSubset(root, sourceId);
  if (!subset) {
    if (required) fail(`falta data/lake-subsets/${sourceId.replace("gastos_", "gastos-")}.subset.json`);
    return null;
  }
  if (subset.recordCount !== subset.records.length) fail(`${sourceId} recordCount no coincide`);
  if (required && subset.recordCount === 0) fail(`${sourceId} está vacío; no se publica una ficha sin rendiciones`);
  const rebuilt = buildExpenseSubset({ sourceId, records: subset.records, generatedAt: subset.generatedAt });
  if (rebuilt.checksumSha256 !== subset.checksumSha256) fail(`${sourceId} checksum inválido`);
  const ids = new Set();
  for (const record of subset.records) {
    if (ids.has(record.id)) fail(`${sourceId} tiene id duplicado ${record.id}`);
    ids.add(record.id);
    if (!/^\d{4}-\d{2}$/.test(record.periodo)) fail(`${sourceId}/${record.id} período inválido`);
    if (!Number.isSafeInteger(record.monto_clp) || record.monto_clp < 0) fail(`${sourceId}/${record.id} monto inválido`);
    if (!/^https:\/\//i.test(record.url ?? "")) fail(`${sourceId}/${record.id} no tiene fuente HTTPS`);
  }
  return subset;
}).filter(Boolean);

if (subsets.length === 0) {
  console.log(JSON.stringify({ status: "skipped", reason: "no expense subsets in clean checkout" }));
  process.exit(0);
}

const subsetIds = new Set(subsets.flatMap((subset) => subset.records.map((record) => record.id)));
let sliceCount = 0;
const sliceIds = new Set();
const sliceRecordOwners = new Map();
if (existsSync(slicesDir)) {
  for (const name of readdirSync(slicesDir).filter((entry) => entry.endsWith(".json"))) {
    const slice = JSON.parse(readFileSync(join(slicesDir, name), "utf8"));
    const owner = String(slice.id ?? name);
    for (const record of Array.isArray(slice.gastos) ? slice.gastos : []) {
      const previousOwner = sliceRecordOwners.get(record.id);
      if (previousOwner && previousOwner !== owner) fail(`gasto ${record.id} aparece en fichas distintas`);
      if (previousOwner) continue;
      sliceRecordOwners.set(record.id, owner);
      sliceCount += 1;
      sliceIds.add(record.id);
    }
  }
}
if (required && verifySlices && subsetIds.size !== sliceIds.size) fail(`slices contienen ${sliceIds.size} gastos y subsets ${subsetIds.size}`);
for (const id of subsetIds) if (!sliceIds.has(id) && required && verifySlices) fail(`gasto ${id} no llegó a una ficha estática`);

console.log(JSON.stringify({
  status: "ok",
  sources: subsets.map((subset) => ({ sourceId: subset.sourceId, records: subset.recordCount, politicians: subset.politicianCount, periods: subset.periods })),
  totalRecords: subsets.reduce((total, subset) => total + subset.recordCount, 0),
  sliceRecords: sliceCount,
}, null, 2));
