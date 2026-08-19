import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { SERVEL_DATASETS, fetchServelPreliminaryResults } from "./etl/connectors/servel.mjs";
import { buildLakePlan } from "./etl/lake.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = resolve(argument("--output") ?? join(root, "data", "lake"));
const inputDir = argument("--input-dir") ? resolve(argument("--input-dir")) : null;
if (outputRoot === root || dirname(outputRoot) === outputRoot) throw new Error("INVALID_OUTPUT_PATH");
const requestedContest = argument("--contest");
const contests = requestedContest ? [requestedContest] : Object.keys(SERVEL_DATASETS);
for (const contest of contests) if (!SERVEL_DATASETS[contest]) throw new Error(`SERVEL_UNKNOWN_CONTEST: ${contest}`);

const localNames = { president: "presidente.zip", deputies: "diputados.zip", senators: "senadores.zip" };
const results = [];
for (const contest of contests) {
  const fetchImpl = inputDir
    ? async () => {
        const localPath = join(inputDir, localNames[contest]);
        if (!existsSync(localPath)) throw new Error(`SERVEL_LOCAL_ARCHIVE_NOT_FOUND: ${localPath}`);
        return new Response(readFileSync(localPath), { headers: { "content-type": "application/zip" } });
      }
    : fetch;
  results.push(await fetchServelPreliminaryResults({ contest, fetchImpl }));
}

const records = results.flatMap((result) => result.records);
const serialized = JSON.stringify(records);
if (/"(?:rut|run|rut_persona|rut_personal|domicilio|direccion_particular)"\s*:/i.test(serialized)) {
  throw new Error("SERVEL_PERSONAL_IDENTIFIER_IN_PUBLIC_PROJECTION");
}
const ids = new Set(records.map((record) => record.id));
if (ids.size !== records.length) throw new Error("SERVEL_DUPLICATE_RECORD_ACROSS_CONTESTS");

const snapshot = JSON.parse(readFileSync(join(root, "data", "etl", "latest.json"), "utf8"));
snapshot.actualizado_en = new Date().toISOString();
snapshot.fuentes.servel = records;
const inventoryPath = join(root, "data", "etl", "source-inventory.json");
const sourceInventory = existsSync(inventoryPath) ? JSON.parse(readFileSync(inventoryPath, "utf8")) : null;
const existingCatalogPath = join(outputRoot, "catalog", "v1", "manifest.json");
const existingCatalog = existsSync(existingCatalogPath) ? JSON.parse(readFileSync(existingCatalogPath, "utf8")) : null;
const plan = buildLakePlan(snapshot, {
  sourceInventory,
  existingCatalog,
  originalAssets: results.map((result) => ({ sourceId: "servel", year: result.year, month: result.month, ...result.original })),
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
console.log(JSON.stringify({
  source: "servel",
  status: "preliminary",
  datasets: results.map((result) => ({ id: result.dataset, period: result.period, records: result.records.length, originalChecksumSha256: result.original.checksumSha256 })),
  records: records.length,
  candidates: new Set(records.flatMap((record) => record.subject_entity_ids)).size,
  assets: plan.assets.length,
  output: outputRoot,
}, null, 2));
