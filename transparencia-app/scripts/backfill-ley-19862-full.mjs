import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fetchTransferMonth } from "./etl/connectors/ley-19862.mjs";
import { buildLakePlan } from "./etl/lake.mjs";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function integerArgument(name, fallback, min, max) {
  const value = Number(argument(name, fallback));
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`INVALID_${name.replaceAll("-", "_").toUpperCase()}`);
  return value;
}

const root = resolve(import.meta.dirname, "..");
const year = integerArgument("--year", new Date().getUTCFullYear(), 2003, new Date().getUTCFullYear());
const throughMonth = integerArgument("--through-month", new Date().getUTCMonth() + 1, 1, 12);
const lakeRoot = resolve(argument("--lake", join(root, "data", "lake")));
const catalogPath = join(lakeRoot, "catalog", "v1", "manifest.json");
const inventoryPath = join(root, "data", "etl", "source-inventory.json");
if (!existsSync(catalogPath)) throw new Error(`LEY_19862_CATALOG_MISSING: ${catalogPath}`);
if (!existsSync(inventoryPath)) throw new Error(`LEY_19862_INVENTORY_MISSING: ${inventoryPath}`);

const existingCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const sourceInventory = JSON.parse(readFileSync(inventoryPath, "utf8"));
const records = [];
const originalAssets = [];
const periods = [];

for (let month = 1; month <= throughMonth; month += 1) {
  const result = await fetchTransferMonth({ year, month });
  periods.push(result.period);
  records.push(...result.records);
  originalAssets.push({ sourceId: "ley-19862", year, month, ...result.original });
  console.log(JSON.stringify({ period: result.period, records: result.records.length, checksum: result.original.checksumSha256 }));
}

const ids = new Set(records.map((record) => record.id));
if (ids.size !== records.length) throw new Error(`LEY_19862_DUPLICATE_FOLIO: ${records.length - ids.size}`);

const snapshot = {
  generado_por: "scripts/backfill-ley-19862-full.mjs",
  actualizado_en: new Date().toISOString(),
  fuentes: { "ley-19862": records },
};
const catalogWithoutPreviousLey = {
  ...existingCatalog,
  partitions: (existingCatalog.partitions ?? []).filter((partition) => partition.sourceId !== "ley-19862"),
};
const plan = buildLakePlan(snapshot, {
  sourceInventory,
  existingCatalog: catalogWithoutPreviousLey,
  originalAssets,
});

for (const item of plan.assets) {
  const target = resolve(lakeRoot, item.key);
  if (!(target.startsWith(`${lakeRoot}${sep}`) || target.startsWith(`${lakeRoot}/`))) throw new Error(`LEY_19862_INVALID_ASSET_KEY: ${item.key}`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, item.data);
}
writeFileSync(catalogPath, `${JSON.stringify(plan.catalog, null, 2)}\n`, "utf8");
writeFileSync(join(lakeRoot, "publish-plan.json"), `${JSON.stringify({
  schemaVersion: "1.0.0",
  generatedAt: snapshot.actualizado_en,
  assets: plan.assets.map(({ key, checksumSha256, size, releaseTag, releaseAssetName }) => ({ key, checksumSha256, size, releaseTag, releaseAssetName })),
}, null, 2)}\n`, "utf8");

const source = plan.catalog.sources.find((candidate) => candidate.id === "ley-19862");
console.log(JSON.stringify({
  source: "ley-19862",
  year,
  throughMonth,
  periods,
  records: records.length,
  catalogRecordCount: source?.recordCount ?? 0,
  assets: plan.assets.length,
  output: lakeRoot,
}, null, 2));
