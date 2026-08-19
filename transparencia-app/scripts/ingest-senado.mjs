import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverLatestSenatePeriod, fetchSenateDiet, fetchSenateDomesticTickets, fetchSenateForeignMissions, fetchSenateOperationalExpenses } from "./etl/connectors/senado.mjs";
import { buildLakePlan } from "./etl/lake.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requestedYear = argument("--year") ? Number(argument("--year")) : null;
const requestedMonth = argument("--month") ? Number(argument("--month")) : null;
if ((requestedYear === null) !== (requestedMonth === null)) throw new Error("YEAR_AND_MONTH_REQUIRED_TOGETHER");
const outputRoot = resolve(argument("--output") ?? join(root, "data", "lake"));
if (outputRoot === root || dirname(outputRoot) === outputRoot) throw new Error("INVALID_OUTPUT_PATH");

const datasets = [
  { id: "operational_expenses", fetcher: fetchSenateOperationalExpenses },
  { id: "diet", fetcher: fetchSenateDiet },
  { id: "domestic_tickets", fetcher: fetchSenateDomesticTickets },
  { id: "foreign_missions", fetcher: fetchSenateForeignMissions },
];
const results = [];
for (const dataset of datasets) {
  const period = requestedYear === null || requestedMonth === null
    ? await discoverLatestSenatePeriod({ dataset: dataset.id })
    : { year: requestedYear, month: requestedMonth };
  results.push(await dataset.fetcher(period));
}
const snapshot = JSON.parse(readFileSync(join(root, "data", "etl", "latest.json"), "utf8"));
snapshot.actualizado_en = new Date().toISOString();
snapshot.fuentes.senado = results.flatMap((result) => result.records);
const inventoryPath = join(root, "data", "etl", "source-inventory.json");
const sourceInventory = existsSync(inventoryPath) ? JSON.parse(readFileSync(inventoryPath, "utf8")) : null;
const existingCatalogPath = join(outputRoot, "catalog", "v1", "manifest.json");
const existingCatalog = existsSync(existingCatalogPath) ? JSON.parse(readFileSync(existingCatalogPath, "utf8")) : null;
const plan = buildLakePlan(snapshot, {
  sourceInventory,
  existingCatalog,
  originalAssets: results.map((result) => ({ sourceId: "senado", year: result.year, month: result.month, ...result.original })),
});
for (const item of plan.assets) {
  const target = resolve(outputRoot, item.key);
  if (!target.startsWith(`${outputRoot}${sep}`)) throw new Error(`INVALID_ASSET_KEY: ${item.key}`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, item.data);
}
const publishPlan = {
  schemaVersion: "1.0.0", generatedAt: snapshot.actualizado_en,
  assets: plan.assets.map((item) => ({ key: item.key, checksumSha256: item.checksumSha256, size: item.size, releaseTag: item.releaseTag, releaseAssetName: item.releaseAssetName })),
};
writeFileSync(join(outputRoot, "publish-plan.json"), `${JSON.stringify(publishPlan, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ source: "senado", datasets: results.map((result) => ({ id: result.dataset ?? "operational_expenses", period: result.period, records: result.records.length, originalChecksumSha256: result.original.checksumSha256 })), records: results.reduce((total, result) => total + result.records.length, 0), assets: plan.assets.length, output: outputRoot }, null, 2));
