import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { auditDipresHierarchy, fetchDipresExecutions } from "./etl/connectors/dipres.mjs";
import { buildLakePlan } from "./etl/lake.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const year = Number(argument("--year") ?? new Date().getUTCFullYear());
const monthArgument = argument("--month");
const month = monthArgument === undefined ? undefined : Number(monthArgument);
if (!Number.isInteger(year) || year < 1990 || year > new Date().getUTCFullYear()) throw new Error("INVALID_YEAR");
if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) throw new Error("INVALID_MONTH");
const outputRoot = resolve(argument("--output") ?? join(root, "data", "lake"));
if (outputRoot === root || dirname(outputRoot) === outputRoot) throw new Error("INVALID_OUTPUT_PATH");

const results = await fetchDipresExecutions({ year, months: month === undefined ? undefined : [month] });
const records = results.flatMap((result) => result.records);
const hierarchyAudit = auditDipresHierarchy(records);
const snapshot = JSON.parse(readFileSync(join(root, "data", "etl", "latest.json"), "utf8"));
snapshot.actualizado_en = new Date().toISOString();
snapshot.fuentes = { dipres: records };
const inventoryPath = join(root, "data", "etl", "source-inventory.json");
const sourceInventory = existsSync(inventoryPath) ? JSON.parse(readFileSync(inventoryPath, "utf8")) : null;
const existingCatalogPath = join(outputRoot, "catalog", "v1", "manifest.json");
const existingCatalog = existsSync(existingCatalogPath) ? JSON.parse(readFileSync(existingCatalogPath, "utf8")) : null;
const existingDipresSource = existingCatalog?.sources?.find((source) => source.id === "dipres") ?? null;
function readExistingProjection(key) {
  if (!key) return [];
  const path = resolve(outputRoot, key);
  if (!path.startsWith(`${outputRoot}${sep}`) || !existsSync(path)) return [];
  const text = gunzipSync(readFileSync(path)).toString("utf8").trim();
  return text ? text.split("\n").map((line) => JSON.parse(line)) : [];
}
const existingEntityBundles = existingDipresSource ? {
  dipres: {
    entities: readExistingProjection(existingDipresSource.entityKey),
    indexes: readExistingProjection(existingDipresSource.entityIndexKey),
  },
} : {};
const plan = buildLakePlan(snapshot, {
  sourceInventory,
  existingCatalog,
  existingEntityBundles,
  originalAssets: results.map((result) => ({ sourceId: "dipres", year, month: result.month, ...result.original })),
  sourceMetadata: {
    dipres: {
      license: "Datos públicos oficiales DIPRES",
      notes: "Los totales deben calcularse sólo con filas summable=true y separando ingresos de gastos; las filas agregadas se conservan para navegación sin duplicar montos.",
      coverage: {
        year, periodsPublished: results.map((result) => result.period),
        recordsByPeriod: Object.fromEntries(results.map((result) => [result.period, result.records.length])),
        budgetPrograms: new Set(records.flatMap((record) => record.subject_entity_ids ?? [])).size,
        summableRows: records.filter((record) => record.summable).length,
        aggregateRows: records.filter((record) => record.is_aggregate).length,
        programResultRows: records.filter((record) => record.classification_level === "program_result").length,
        hierarchyComparedAggregates: hierarchyAudit.comparedAggregates,
        hierarchyMismatchCount: hierarchyAudit.mismatchCount,
        hierarchyMismatchRecordIds: [...new Set(hierarchyAudit.discrepancies.map((item) => item.recordId))].sort(),
        sourceDuplicateRows: records.filter((record) => record.source_duplicate).length,
        repairedSchemaRows: records.filter((record) => record.source_schema_repair).length,
      },
    },
  },
});

for (const item of plan.assets) {
  const target = resolve(outputRoot, item.key);
  if (!target.startsWith(`${outputRoot}${sep}`)) throw new Error(`INVALID_ASSET_KEY: ${item.key}`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, item.data);
}
const publishPlan = {
  schemaVersion: "1.0.0",
  generatedAt: snapshot.actualizado_en,
  assets: plan.assets.map((item) => ({
    key: item.key, checksumSha256: item.checksumSha256, size: item.size,
    releaseTag: item.releaseTag, releaseAssetName: item.releaseAssetName,
  })),
};
writeFileSync(join(outputRoot, "publish-plan.json"), `${JSON.stringify(publishPlan, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ source: "dipres", periods: results.map((result) => result.period), records: records.length, hierarchyAudit: { comparedAggregates: hierarchyAudit.comparedAggregates, mismatchCount: hierarchyAudit.mismatchCount }, originals: results.map((result) => ({ period: result.period, checksumSha256: result.original.checksumSha256 })), assets: plan.assets.length, output: outputRoot }, null, 2));
