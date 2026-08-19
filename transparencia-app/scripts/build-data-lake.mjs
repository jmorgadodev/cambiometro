import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLakePlan } from "./etl/lake.mjs";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = resolve(appRoot, "data", "etl", "latest.json");
const inventoryPath = resolve(appRoot, "data", "etl", "source-inventory.json");
const outputArgIndex = process.argv.indexOf("--output");
const outputRoot = resolve(outputArgIndex >= 0 ? process.argv[outputArgIndex + 1] : join(appRoot, "data", "lake"));
const dryRun = process.argv.includes("--dry-run");
const excludeSourceIndex = process.argv.indexOf("--exclude-source");
const excludedSources = new Set((excludeSourceIndex >= 0 ? process.argv[excludeSourceIndex + 1] : "")
  .split(",").map((value) => value.trim()).filter(Boolean));

if (!existsSync(snapshotPath)) throw new Error(`Snapshot inexistente: ${snapshotPath}`);
if (outputRoot === appRoot || dirname(outputRoot) === outputRoot) throw new Error("INVALID_OUTPUT_PATH");

const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
for (const source of excludedSources) delete snapshot.fuentes?.[source];
const sourceInventory = existsSync(inventoryPath) ? JSON.parse(readFileSync(inventoryPath, "utf8")) : null;
const existingCatalogPath = join(outputRoot, "catalog", "v1", "manifest.json");
let existingCatalog = null;
if (existsSync(existingCatalogPath)) {
  try {
    const raw = readFileSync(existingCatalogPath, "utf8").trim();
    if (raw) existingCatalog = JSON.parse(raw);
  } catch (e) {
    console.warn(`[WARN] Ignorando catálogo inválido o vacío: ${e.message}`);
  }
}
const plan = buildLakePlan(snapshot, { sourceInventory, existingCatalog });
const publishPlan = {
  schemaVersion: "1.0.0",
  generatedAt: snapshot.actualizado_en ?? null,
  assets: plan.assets.map((asset) => ({
    key: asset.key,
    checksumSha256: asset.checksumSha256,
    size: asset.size,
    releaseTag: asset.releaseTag,
    releaseAssetName: asset.releaseAssetName,
  })),
};

if (!dryRun) {
  for (const item of plan.assets) {
    const target = resolve(outputRoot, item.key);
    if (!target.startsWith(`${outputRoot}${sep}`)) throw new Error(`INVALID_ASSET_KEY: ${item.key}`);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, item.data);
  }
  writeFileSync(join(outputRoot, "publish-plan.json"), `${JSON.stringify(publishPlan, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify({
  mode: dryRun ? "dry-run" : "write",
  output: dryRun ? null : outputRoot,
  sources: plan.catalog.sources.length,
  partitions: plan.catalog.partitions.length,
  assets: plan.assets.length,
  bytes: plan.assets.reduce((total, item) => total + item.size, 0),
}, null, 2));
