import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { fetchTransferMonth } from "./etl/connectors/ley-19862.mjs";
import { buildLakePlan } from "./etl/lake.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const year = Number(argument("--year"));
const month = Number(argument("--month"));
if (!Number.isInteger(year) || year < 2003 || year > new Date().getUTCFullYear()) throw new Error("INVALID_YEAR");
if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error("INVALID_MONTH");
const outputRoot = resolve(argument("--output") ?? join(root, "data", "lake"));
if (outputRoot === root || dirname(outputRoot) === outputRoot) throw new Error("INVALID_OUTPUT_PATH");

const result = await fetchTransferMonth({ year, month });
const snapshot = JSON.parse(readFileSync(join(root, "data", "etl", "latest.json"), "utf8"));
snapshot.actualizado_en = new Date().toISOString();
snapshot.fuentes["ley-19862"] = result.records;
const inventoryPath = join(root, "data", "etl", "source-inventory.json");
const sourceInventory = existsSync(inventoryPath) ? JSON.parse(readFileSync(inventoryPath, "utf8")) : null;
const existingCatalogPath = join(outputRoot, "catalog", "v1", "manifest.json");
const existingCatalog = existsSync(existingCatalogPath) ? JSON.parse(readFileSync(existingCatalogPath, "utf8")) : null;
const existingLeySource = existingCatalog?.sources?.find((source) => source.id === "ley-19862") ?? null;
function readExistingProjection(key) {
  if (!key) return [];
  const path = resolve(outputRoot, key);
  if (!path.startsWith(`${outputRoot}${sep}`) || !existsSync(path)) return [];
  const text = gunzipSync(readFileSync(path)).toString("utf8").trim();
  return text ? text.split("\n").map((line) => JSON.parse(line)) : [];
}
const existingEntityBundles = existingLeySource ? {
  "ley-19862": {
    entities: readExistingProjection(existingLeySource.entityKey),
    indexes: readExistingProjection(existingLeySource.entityIndexKey),
  },
} : {};
const plan = buildLakePlan(snapshot, {
  sourceInventory,
  existingCatalog,
  existingEntityBundles,
  replaceSourceIds: process.env.LEY_19862_REPLACE_CATALOG === "true" ? ["ley-19862"] : [],
  originalAssets: [{ sourceId: "ley-19862", year, month, ...result.original }],
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
  assets: plan.assets.map((item) => ({ key: item.key, checksumSha256: item.checksumSha256, size: item.size, releaseTag: item.releaseTag, releaseAssetName: item.releaseAssetName })),
};
writeFileSync(join(outputRoot, "publish-plan.json"), `${JSON.stringify(publishPlan, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ source: "ley-19862", period: result.period, records: result.records.length, originalChecksumSha256: result.original.checksumSha256, assets: plan.assets.length, output: outputRoot }, null, 2));
