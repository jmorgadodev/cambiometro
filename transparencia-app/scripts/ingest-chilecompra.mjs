import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchChileCompraMonth } from "./etl/connectors/chilecompra.mjs";
import { gzipDeterministicJsonl, stableStringify } from "./etl/core.mjs";
import { buildLakePlan } from "./etl/lake.mjs";
import { createCheckpointFetch } from "./etl/checkpoint-cache.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const year = Number(argument("--year") ?? new Date().getUTCFullYear());
const month = Number(argument("--month"));
const concurrency = Number(argument("--concurrency") ?? 12);
const requestsPerSecond = Number(argument("--rate") ?? 20);
const selectedTypes = argument("--types")?.split(",").map((value) => value.trim()).filter(Boolean);
if (!Number.isInteger(year) || year < 2009 || year > new Date().getUTCFullYear()) throw new Error("INVALID_YEAR");
if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error("INVALID_MONTH");
const outputRoot = resolve(argument("--output") ?? join(root, "data", "lake"));
if (outputRoot === root || dirname(outputRoot) === outputRoot) throw new Error("INVALID_OUTPUT_PATH");

const cacheRoot = join(outputRoot, ".work", `chilecompra-${year}-${String(month).padStart(2, "0")}`);
const cachedFetch = createCheckpointFetch({ cacheRoot });

const result = await fetchChileCompraMonth({
  year,
  month,
  concurrency,
  requestsPerSecond,
  fetchImpl: cachedFetch,
  ...(selectedTypes ? { types: selectedTypes } : {}),
  onProgress(progress) {
    process.stderr.write(`${JSON.stringify(progress)}\n`);
  },
});
const originalProjection = await gzipDeterministicJsonl(
  result.documents.map((document) => ({ url: document.url, procurementType: document.procurementType, stage: document.stage, payload: document.payload })),
  (a, b) => a.url.localeCompare(b.url),
);
const original = originalProjection.compressed;
const originalChecksumSha256 = originalProjection.checksumSha256;
const originalSize = original.byteLength;

const snapshot = JSON.parse(readFileSync(join(root, "data", "etl", "latest.json"), "utf8"));
snapshot.actualizado_en = new Date().toISOString();
snapshot.fuentes.chilecompra = result.records.map((record) => ({ ...record, source_period: result.period }));
const inventoryPath = join(root, "data", "etl", "source-inventory.json");
const sourceInventory = existsSync(inventoryPath) ? JSON.parse(readFileSync(inventoryPath, "utf8")) : null;
const existingCatalogPath = join(outputRoot, "catalog", "v1", "manifest.json");
const existingCatalog = existsSync(existingCatalogPath) ? JSON.parse(readFileSync(existingCatalogPath, "utf8")) : null;
const originalAssets = [{
  sourceId: "chilecompra",
  year,
  month,
  name: `chilecompra-${result.period}-ocds-original.jsonl.gz`,
  url: "https://datos-abiertos.chilecompra.cl/descargas/procesos-ocds",
  checksumSha256: originalChecksumSha256,
  size: originalSize,
  license: "CC0-1.0",
  redistributable: false,
}];
if (result.rejectedDocuments.length > 0) {
  originalAssets.push({
    sourceId: "chilecompra",
    year,
    month,
    name: `chilecompra-${result.period}-rejected-documents.json`,
    url: "https://datos-abiertos.chilecompra.cl/descargas/procesos-ocds",
    data: Buffer.from(`${stableStringify({ count: result.rejectedDocuments.length, documents: result.rejectedDocuments })}\n`, "utf8"),
    license: "CC0-1.0",
    redistributable: true,
  });
}
const plan = buildLakePlan(snapshot, {
  sourceInventory,
  existingCatalog,
  originalAssets,
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
    key: item.key,
    checksumSha256: item.checksumSha256,
    size: item.size,
    releaseTag: item.releaseTag,
    releaseAssetName: item.releaseAssetName,
  })),
};
writeFileSync(join(outputRoot, "publish-plan.json"), `${JSON.stringify(publishPlan, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ source: "chilecompra", period: result.period, listingCounts: result.listingCounts, documents: result.documents.length, rejectedDocuments: result.rejectedDocuments.length, records: result.records.length, originalChecksumSha256, originalSize, originalArchived: false, assets: plan.assets.length, output: outputRoot }, null, 2));
