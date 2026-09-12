import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputDir = path.join(root, "public", "data", "remuneraciones-unified");
const source38 = JSON.parse(fs.readFileSync(path.join(root, "data", "remuneraciones-38bis-publico.json"), "utf8"));
const source38History = JSON.parse(fs.readFileSync(path.join(root, "data", "remuneraciones-38bis-publico-historico.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(outputDir, "manifest.json"), "utf8"));

const rows = [];
for (const page of manifest.pages) {
  const pageRows = JSON.parse(fs.readFileSync(path.join(outputDir, page.key), "utf8"));
  rows.push(...pageRows);
}

const expected38Bis = [
  { period: source38.mes, rows: source38.registros ?? source38.congreso ?? [] },
  ...(source38History.periodos ?? []).map((release) => ({ period: release.mes, rows: release.registros ?? [] })),
];
const actual38Bis = rows.filter((row) => row.sourceId === "remuneraciones-38bis");
const actualPeriods = new Set(actual38Bis.map((row) => row.periodo));
const expectedCount = expected38Bis.reduce((total, release) => total + release.rows.length, 0);
const missingPeriods = expected38Bis.map((release) => release.period).filter((period) => !actualPeriods.has(period));
const sofiaPeriods = actual38Bis.filter((row) => /sofia pumpin/i.test(row.nombreOriginal)).map((row) => row.periodo).sort();

function expectedSourcePeriod(sourceId) {
  const periods = [...new Set(rows.filter((row) => row.sourceId === sourceId).map((row) => row.periodo).filter(Boolean))]
    .sort((left, right) => String(left).localeCompare(String(right), "es-CL"));
  if (periods.length === 0) return null;
  if (periods.length === 1) return periods[0];
  return `${periods[0]} / ${periods.at(-1)}`;
}

if (manifest.totalRows !== rows.length) throw new Error(`MANIFEST_ROW_COUNT_MISMATCH: ${manifest.totalRows} != ${rows.length}`);
if (actual38Bis.length !== expectedCount) throw new Error(`38BIS_HISTORY_COUNT_MISMATCH: ${actual38Bis.length} != ${expectedCount}`);
if (missingPeriods.length) throw new Error(`38BIS_MISSING_PERIODS: ${missingPeriods.join(",")}`);
if (sofiaPeriods.length < 2) throw new Error("38BIS_HISTORY_SEARCH_MISSING: Sofía Pumpin debe tener al menos dos períodos");

for (const sourceId of ["camara", "senado"]) {
  const source = manifest.sources.find((item) => item.id === sourceId);
  const expectedPeriod = expectedSourcePeriod(sourceId);
  if (!source) throw new Error(`SOURCE_MANIFEST_MISSING: ${sourceId}`);
  if (source.period !== expectedPeriod) {
    throw new Error(`SOURCE_PERIOD_MISMATCH: ${sourceId}: ${source.period} != ${expectedPeriod}`);
  }
}

console.log(JSON.stringify({
  status: "ok",
  totalRows: rows.length,
  source38BisRows: actual38Bis.length,
  source38BisPeriods: [...actualPeriods].sort(),
  supportPeriods: Object.fromEntries(["camara", "senado"].map((sourceId) => [sourceId, expectedSourcePeriod(sourceId)])),
  sofiaPumpinPeriods: sofiaPeriods,
}, null, 2));
