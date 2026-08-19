import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchCamaraAttendance } from "./etl/connectors/camara-attendance.mjs";
import { buildLakePlan } from "./etl/lake.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const year = Number(argument("--year") ?? new Date().getUTCFullYear());
const concurrency = Number(argument("--concurrency") ?? 8);
if (!Number.isInteger(year) || year < 1990 || year > new Date().getUTCFullYear()) throw new Error("INVALID_YEAR");
const outputRoot = resolve(argument("--output") ?? join(root, "data", "lake"));
if (outputRoot === root || dirname(outputRoot) === outputRoot) throw new Error("INVALID_OUTPUT_PATH");

const result = await fetchCamaraAttendance({
  year,
  concurrency,
  onProgress(progress) { process.stderr.write(`${JSON.stringify(progress)}\n`); },
});
const serialized = JSON.stringify(result.records);
if (/"(?:rut|run|rut_persona|rut_personal|domicilio|direccion_particular)"\s*:/i.test(serialized)) {
  throw new Error("CAMARA_PERSONAL_IDENTIFIER_IN_PUBLIC_PROJECTION");
}

const snapshot = JSON.parse(readFileSync(join(root, "data", "etl", "latest.json"), "utf8"));
snapshot.actualizado_en = new Date().toISOString();
snapshot.fuentes.asistencia_camara = result.records;
const inventoryPath = join(root, "data", "etl", "source-inventory.json");
const sourceInventory = existsSync(inventoryPath) ? JSON.parse(readFileSync(inventoryPath, "utf8")) : null;
const existingCatalogPath = join(outputRoot, "catalog", "v1", "manifest.json");
const existingCatalog = existsSync(existingCatalogPath) ? JSON.parse(readFileSync(existingCatalogPath, "utf8")) : null;
const plan = buildLakePlan(snapshot, {
  sourceInventory,
  existingCatalog,
  originalAssets: result.originals.map((original) => ({ sourceId: "camara", ...original })),
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
console.log(JSON.stringify({
  source: "camara",
  dataset: "attendance",
  year,
  periods: result.periods,
  sessionsFound: result.sessionsFound,
  sessionsPublished: result.sessionsPublished,
  sessionsUnavailable: result.sessionsUnavailable,
  records: result.records.length,
  deputies: new Set(result.records.map((record) => record.deputy.official_id)).size,
  annualSessionsChecksumSha256: result.annualSessionsChecksumSha256,
  assets: plan.assets.length,
  output: outputRoot,
}, null, 2));
