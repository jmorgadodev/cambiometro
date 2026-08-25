import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const requireFull = process.argv.includes("--require-full");

const expected = {
  totalTransfers: 59361,
  totalMontoClp: 5011094170302,
  totalReceptores: 14640,
  totalEmisores: 272,
  summarySample: 1000,
  subsetSample: 50,
};

const readJson = (relativePath) => {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Falta artefacto requerido: ${relativePath}`);
  }
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
};

const summary = readJson("data/lake/projections/v1/ley19862-summary.json");
const subset = readJson("data/lake-subsets/ley19862.subset.json");
const health = readJson("data/etl/source-health.json");
const inventory = readJson("data/etl/source-inventory.json");

const checks = [];
const check = (name, condition, detail) => {
  checks.push({ name, ok: Boolean(condition), detail });
};

const summaryKpis = summary.kpis ?? {};
const subsetKpis = subset.kpis ?? {};
const healthLey = health.sources?.ley19862 ?? {};
const inventoryLey = inventory.sources?.find((source) => source.id === "ley-19862");

function yearlyTotals(dataset) {
  return Object.values(dataset?.by_year ?? {}).reduce(
    (totals, year) => ({
      count: totals.count + Number(year?.count ?? 0),
      amount: totals.amount + Number(year?.total ?? 0),
    }),
    { count: 0, amount: 0 },
  );
}

for (const [label, key, value] of [
  ["total de transferencias", "total_transfers", expected.totalTransfers],
  ["monto total CLP", "total_monto_clp", expected.totalMontoClp],
  ["total de receptores", "total_receptores", expected.totalReceptores],
  ["total de emisores", "total_emisores", expected.totalEmisores],
]) {
  check(`proyección: ${label}`, summaryKpis[key] === value, `${summaryKpis[key]} != ${value}`);
  check(`subset: ${label}`, subsetKpis[key] === value, `${subsetKpis[key]} != ${value}`);
}

check(
  "health: total y monto coinciden",
  healthLey.recordCount === expected.totalTransfers && healthLey.financialAmountClp === expected.totalMontoClp,
  `${healthLey.recordCount}/${healthLey.financialAmountClp}`,
);

for (const [label, dataset] of [["proyección", summary], ["subset", subset]]) {
  const totals = yearlyTotals(dataset);
  check(
    `${label}: suma anual de registros coincide`,
    totals.count === dataset.kpis?.total_transfers,
    `${totals.count} != ${dataset.kpis?.total_transfers}`,
  );
  check(
    `${label}: suma anual de montos coincide`,
    totals.amount === dataset.kpis?.total_monto_clp,
    `${totals.amount} != ${dataset.kpis?.total_monto_clp}`,
  );
}

const summarySample = Array.isArray(summary.transfers_sample) ? summary.transfers_sample : [];
const subsetSample = Array.isArray(subset.transfers_sample) ? subset.transfers_sample : [];
const uniqueIds = (rows) => new Set(rows.map((row) => row.id)).size === rows.length;

check("muestra de proyección: tamaño", summarySample.length === expected.summarySample, `${summarySample.length} != ${expected.summarySample}`);
check("muestra de subset: tamaño", subsetSample.length === expected.subsetSample, `${subsetSample.length} != ${expected.subsetSample}`);
check("muestra de proyección: ids únicos", uniqueIds(summarySample), "hay ids duplicados");
check("muestra de subset: ids únicos", uniqueIds(subsetSample), "hay ids duplicados");
check(
  "muestras: URLs oficiales",
  [...summarySample, ...subsetSample].every((row) => typeof row.url === "string" && row.url.startsWith("https://registros19862.gob.cl/")),
  "hay filas sin URL oficial de Registro 19862",
);

const partitionDir = path.join(root, "data", "lake", "partitions", "ley-19862");
const fullSourcePresent = fs.existsSync(partitionDir)
  && fs.readdirSync(partitionDir, { recursive: true }).some((entry) => String(entry).endsWith(".jsonl.gz"));
const sourceStatus = inventoryLey?.status ?? healthLey.status ?? "unknown";

check("inventario: fuente ley-19862 declarada", Boolean(inventoryLey), "no existe en source-inventory.json");
check("inventario: estado reportado", sourceStatus === "partial" || sourceStatus === "complete", sourceStatus);

if (requireFull && fullSourcePresent) {
  const manifests = fs.readdirSync(partitionDir, { recursive: true })
    .filter((entry) => String(entry).endsWith("manifest.json"))
    .map((entry) => path.join(partitionDir, String(entry)));
  const partitionRecordCount = manifests.reduce((total, manifestPath) => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    return total + Number(manifest.recordCount ?? 0);
  }, 0);
  check(
    "particiones full: total de filas coincide con snapshot canónico",
    partitionRecordCount === expected.totalTransfers,
    `${partitionRecordCount} != ${expected.totalTransfers}`,
  );
}

const failed = checks.filter((item) => !item.ok);
const result = {
  dataset: "ley-19862-transferencias",
  mode: requireFull ? "require-full" : "pinned-snapshot",
  coherentPinnedSnapshot: failed.length === 0,
  fullSourcePresent,
  sourceStatus,
  expected,
  checks,
  note: fullSourcePresent
    ? "Las particiones locales están disponibles para validación de universo completo."
    : "El checkout contiene metadatos y muestras coherentes, pero no las particiones full ignoradas por Git; el universo completo debe validarse en el workspace ETL/R2 o D1.",
};

console.log(JSON.stringify(result, null, 2));

if (failed.length > 0 || (requireFull && !fullSourcePresent)) {
  process.exitCode = 1;
}
