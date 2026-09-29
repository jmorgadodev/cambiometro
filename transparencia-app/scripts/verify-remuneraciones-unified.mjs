import fs from "node:fs";
import path from "node:path";
import { validateUnifiedStaticManifest } from "./remuneraciones-unified-metadata.mjs";
import { isPlaceholderRemunerationName, remunerationPeriodRange } from "./remuneraciones-unified-contract.mjs";

const root = process.cwd();
const outputDir = path.join(root, "public", "data", "remuneraciones-unified");
const source38 = JSON.parse(fs.readFileSync(path.join(root, "data", "remuneraciones-38bis-publico.json"), "utf8"));
const source38History = JSON.parse(fs.readFileSync(path.join(root, "data", "remuneraciones-38bis-publico-historico.json"), "utf8"));
const support = JSON.parse(fs.readFileSync(path.join(root, "data", "personal-apoyo.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(outputDir, "manifest.json"), "utf8"));
validateUnifiedStaticManifest(manifest);

const rows = [];
for (const page of manifest.pages) {
  const pageRows = JSON.parse(fs.readFileSync(path.join(outputDir, page.key), "utf8"));
  rows.push(...pageRows);
}

const expected38Bis = [
  { period: source38.mes, rows: source38.registros ?? source38.congreso ?? [] },
  ...(source38History.periodos ?? []).map((release) => ({ period: release.mes, rows: release.registros ?? [] })),
];
const supportRows = {
  camara: Object.values(support.diputados ?? {}).flatMap((deputy) =>
    (deputy.personal_apoyo ?? []).map((row) => ({ ...row, periodo: row.periodo ?? deputy.mes_personal ?? null }))),
  senado: Object.values(support.senadores ?? {}).flat(),
};
const actual38Bis = rows.filter((row) => row.sourceId === "remuneraciones-38bis");
const placeholderRows = rows.filter((row) => isPlaceholderRemunerationName(row.nombreOriginal));
const unidentifiableRows = rows.filter((row) => row.qualityObservations?.includes("identity_not_identifiable"));
const actualPeriods = new Set(actual38Bis.map((row) => row.periodo));
const expectedCount = expected38Bis.reduce((total, release) => total + release.rows.length, 0);
const sourceMetadata = new Map(manifest.sources.map((source) => [source.id, source]));
const missingPeriods = expected38Bis.map((release) => release.period).filter((period) => !actualPeriods.has(period));
const sofiaPeriods = actual38Bis.filter((row) => /sofia pumpin/i.test(row.nombreOriginal)).map((row) => row.periodo).sort();

if (manifest.totalRows !== rows.length) throw new Error(`MANIFEST_ROW_COUNT_MISMATCH: ${manifest.totalRows} != ${rows.length}`);
if (actual38Bis.length !== expectedCount) throw new Error(`38BIS_HISTORY_COUNT_MISMATCH: ${actual38Bis.length} != ${expectedCount}`);
if (missingPeriods.length) throw new Error(`38BIS_MISSING_PERIODS: ${missingPeriods.join(",")}`);
if (sofiaPeriods.length < 2) throw new Error("38BIS_HISTORY_SEARCH_MISSING: Sofía Pumpin debe tener al menos dos períodos");
if (placeholderRows.length !== unidentifiableRows.length || manifest.quality?.rows?.unidentifiableName !== placeholderRows.length) {
  throw new Error(`UNIDENTIFIABLE_NAME_QUALITY_COUNT_MISMATCH: source=${placeholderRows.length} flagged=${unidentifiableRows.length} manifest=${manifest.quality?.rows?.unidentifiableName}`);
}
if (new Set(unidentifiableRows.map((row) => row.personKey)).size !== unidentifiableRows.length) {
  throw new Error("UNIDENTIFIABLE_NAMES_MUST_NOT_BE_GROUPED_AS_PERSONS");
}
for (const sourceId of ["camara", "senado"]) {
  const actualRows = rows.filter((row) => row.sourceId === sourceId);
  const expectedRows = supportRows[sourceId];
  const expectedPeriod = remunerationPeriodRange(expectedRows.map((row) => row.periodo));
  const metadata = sourceMetadata.get(sourceId);
  if (actualRows.length !== expectedRows.length || metadata?.publishedCount !== expectedRows.length) {
    throw new Error(`${sourceId.toUpperCase()}_SUPPORT_ROW_COUNT_MISMATCH: rows=${actualRows.length} expected=${expectedRows.length} metadata=${metadata?.publishedCount}`);
  }
  if (metadata?.period !== expectedPeriod) {
    throw new Error(`${sourceId.toUpperCase()}_SUPPORT_PERIOD_MISMATCH: ${metadata?.period} != ${expectedPeriod}`);
  }
}

console.log(JSON.stringify({
  status: "ok",
  totalRows: rows.length,
  source38BisRows: actual38Bis.length,
  source38BisPeriods: [...actualPeriods].sort(),
  sofiaPumpinPeriods: sofiaPeriods,
  unidentifiableNames: placeholderRows.length,
  zeroAmounts: manifest.quality?.rows?.zeroAmount ?? null,
  supportSources: Object.fromEntries(["camara", "senado"].map((sourceId) => [sourceId, {
    rows: supportRows[sourceId].length,
    period: sourceMetadata.get(sourceId)?.period ?? null,
  }])),
}, null, 2));
