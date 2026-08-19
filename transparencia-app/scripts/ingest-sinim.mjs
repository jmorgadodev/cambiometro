import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchSinimAnnual } from "./etl/connectors/sinim.mjs";
import { buildLakePlan } from "./etl/lake.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const year = Number(argument("--year"));
if (!Number.isInteger(year) || year < 2001 || year > new Date().getUTCFullYear()) throw new Error("INVALID_YEAR");
const outputRoot = resolve(argument("--output") ?? join(root, "data", "lake"));
if (outputRoot === root || dirname(outputRoot) === outputRoot) throw new Error("INVALID_OUTPUT_PATH");

const result = await fetchSinimAnnual({ year });
const snapshot = JSON.parse(readFileSync(join(root, "data", "etl", "latest.json"), "utf8"));
snapshot.actualizado_en = new Date().toISOString();
snapshot.fuentes.sinim = result.records;
const inventoryPath = join(root, "data", "etl", "source-inventory.json");
const sourceInventory = existsSync(inventoryPath) ? JSON.parse(readFileSync(inventoryPath, "utf8")) : null;
const existingCatalogPath = join(outputRoot, "catalog", "v1", "manifest.json");
const existingCatalog = existsSync(existingCatalogPath) ? JSON.parse(readFileSync(existingCatalogPath, "utf8")) : null;
const plan = buildLakePlan(snapshot, {
  sourceInventory,
  existingCatalog,
  originalAssets: [{ sourceId: "sinim", year, month: 12, ...result.original }],
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
console.log(JSON.stringify({ source: "sinim", period: result.period, records: result.records.length, municipalities: result.municipalityCount, missingValues: result.missingValueCount, originalChecksumSha256: result.original.checksumSha256, assets: plan.assets.length, output: outputRoot }, null, 2));
