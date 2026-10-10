import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cpltR2ReleaseCount, summarizeSourcePartitions } from "../lib/data-quality-reconciliation.mjs";

const root = process.cwd();
const read = (relative) => JSON.parse(readFileSync(join(root, relative), "utf8"));
const summary = read("data/generated/data-quality-summary.json");
const publicSummary = read("public/data/data-quality-summary.json");
const config = read("data/data-quality-sources.json");
const health = read("data/etl/source-health.json");
const dipresCatalog = (() => {
  try { return read("data/lake/catalog/v1/manifest.json"); } catch { return null; }
})();
const dipresCatalogEntry = dipresCatalog?.sources?.find((entry) => entry?.id === "dipres") ?? null;
const dipresPartitions = dipresCatalogEntry
  ? summarizeSourcePartitions(dipresCatalog.partitions, "dipres", dipresCatalogEntry.recordCount)
  : null;
const cpltManifest = (() => {
  try { return read(".ci-data-version/funcionarios-manifest.json"); } catch {
    try { return read(".ci-data-version/cplt-current-r2-manifest.json"); } catch { return null; }
  }
})();
const cpltReleaseCount = cpltR2ReleaseCount(cpltManifest);
const fail = (message) => { throw new Error(`DATA_QUALITY_SUMMARY_INVALID: ${message}`); };
const healthAliases = { "transparencia-activa": "cplt", "ley-19862": "ley19862", "ine-censo-2024": "ine" };

if (summary.schemaVersion !== 1 || summary.sourceCount !== config.length || summary.sources.length !== config.length) fail("schema o conteo de fuentes incorrecto");
if (JSON.stringify(summary) !== JSON.stringify(publicSummary)) fail("la copia pública no coincide con el artefacto de build");
if (!Number.isSafeInteger(summary.globalKpiRecords) || summary.globalKpiRecords < 1) fail("falta la referencia al KPI global canónico");
const ids = new Set();
const allSourceCountsReconciled = summary.sources.every((source) => source.reconciliation?.comparisonEligible === true);
if (!allSourceCountsReconciled && (summary.totalCanonicalRecords !== null || summary.totalHistoricalRecords !== null)) {
  fail("se publicaron totales agregados aunque hay fuentes sin reconciliar");
}
for (const source of summary.sources) {
  if (ids.has(source.id)) fail(`fuente duplicada: ${source.id}`);
  ids.add(source.id);
  if (!Number.isSafeInteger(source.canonicalCount) || source.canonicalCount < 0) fail(`${source.id}: canonicalCount inválido`);
  if (!Number.isSafeInteger(source.historicalCount) || source.historicalCount < 0) fail(`${source.id}: historicalCount inválido`);
  if (!source.reconciliation || typeof source.reconciliation.note !== "string") fail(`${source.id}: falta reconciliación de conteos`);
  if (!source.reconciliation.comparisonEligible && source.metrics.published.count !== null) fail(`${source.id}: publicó cobertura sin denominadores reconciliados`);
  if (!source.reconciliation.comparisonEligible && source.metrics.queryable.count !== null) fail(`${source.id}: publicó disponibilidad porcentual sin conteos reconciliados`);
  if (source.id === "dipres" && dipresCatalogEntry) {
    if (!dipresPartitions) fail("dipres: las particiones no concilian con el total declarado en el catálogo");
    if (source.canonicalCount !== dipresPartitions.latestRows) fail(`dipres: canonicalCount no coincide con el último corte (${source.canonicalCount} != ${dipresPartitions.latestRows})`);
    if (source.historicalCount !== dipresPartitions.totalRows) fail(`dipres: historicalCount no coincide con las particiones (${source.historicalCount} != ${dipresPartitions.totalRows})`);
    if (source.publicHistoricalCount !== dipresPartitions.latestRows) fail(`dipres: publicHistoricalCount no coincide con el último corte (${source.publicHistoricalCount} != ${dipresPartitions.latestRows})`);
    if (source.catalogDeclaredCount !== dipresCatalogEntry.recordCount) fail(`dipres: catalogDeclaredCount no coincide con el manifiesto (${source.catalogDeclaredCount} != ${dipresCatalogEntry.recordCount})`);
  }
  const healthEntry = health.sources?.[healthAliases[source.id] ?? source.id];
  const expectedCount = source.id === "dipres"
    ? dipresPartitions?.latestRows
    : source.id === "transparencia-activa" && source.reconciliation.state === "release_override"
      ? cpltReleaseCount
      : healthEntry?.recordCount;
  if (source.id === "transparencia-activa" && source.reconciliation.state === "release_override" && !Number.isSafeInteger(expectedCount)) {
    fail("transparencia-activa: release R2 no está presente o no valida contra el índice y sus partes");
  }
  if (Number.isSafeInteger(expectedCount) && source.id !== "ley-19862" && source.canonicalCount !== expectedCount) {
    fail(`${source.id}: canonicalCount no coincide con la referencia vigente (${source.canonicalCount} != ${expectedCount})`);
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
