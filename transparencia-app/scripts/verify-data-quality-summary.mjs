import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (relative) => JSON.parse(readFileSync(join(root, relative), "utf8"));
const summary = read("data/generated/data-quality-summary.json");
const publicSummary = read("public/data/data-quality-summary.json");
const config = read("data/data-quality-sources.json");
const health = read("data/etl/source-health.json");
const fail = (message) => { throw new Error(`DATA_QUALITY_SUMMARY_INVALID: ${message}`); };
const healthAliases = { "transparencia-activa": "cplt", "ley-19862": "ley19862", "ine-censo-2024": "ine" };

if (summary.schemaVersion !== 1 || summary.sourceCount !== config.length || summary.sources.length !== config.length) fail("schema o conteo de fuentes incorrecto");
if (JSON.stringify(summary) !== JSON.stringify(publicSummary)) fail("la copia pública no coincide con el artefacto de build");
if (!Number.isSafeInteger(summary.globalKpiRecords) || summary.globalKpiRecords < 1) fail("falta la referencia al KPI global canónico");
const ids = new Set();
for (const source of summary.sources) {
  if (ids.has(source.id)) fail(`fuente duplicada: ${source.id}`);
  ids.add(source.id);
  if (!Number.isSafeInteger(source.canonicalCount) || source.canonicalCount < 0) fail(`${source.id}: canonicalCount inválido`);
  if (!Number.isSafeInteger(source.historicalCount) || source.historicalCount < 0) fail(`${source.id}: historicalCount inválido`);
  if (!source.reconciliation || typeof source.reconciliation.note !== "string") fail(`${source.id}: falta reconciliación de conteos`);
  if (!source.reconciliation.comparisonEligible && source.metrics.published.count !== null) fail(`${source.id}: publicó cobertura sin denominadores reconciliados`);
  const healthEntry = health.sources?.[healthAliases[source.id] ?? source.id];
  if (Number.isSafeInteger(healthEntry?.recordCount) && source.id !== "ley-19862" && source.canonicalCount !== healthEntry.recordCount) {
    fail(`${source.id}: canonicalCount no coincide con source-health (${source.canonicalCount} != ${healthEntry.recordCount})`);
  }
  for (const [name, metric] of Object.entries(source.metrics)) {
    if (metric.count === null) {
      if (metric.percent !== null || metric.label !== "No calculable") fail(`${source.id}.${name}: métrica nula mal representada`);
    } else if (metric.count < 0 || metric.denominator === null || metric.count > metric.denominator || metric.percent < 0 || metric.percent > 100) {
      fail(`${source.id}.${name}: porcentaje fuera de rango`);
    }
  }
}
console.log(JSON.stringify({ status: "ok", sourceCount: summary.sourceCount, globalKpiRecords: summary.globalKpiRecords, checksum: summary.manifestChecksumSha256 }, null, 2));
