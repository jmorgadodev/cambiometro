import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchInfoLobbyBundle } from "./etl/connectors/cplt.mjs";
import { buildLakePlan } from "./etl/lake.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function validDate(value, code) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())) throw new Error(code);
  return value;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const now = new Date();
const today = now.toISOString().slice(0, 10);
const quarterMonth = Math.floor(now.getUTCMonth() / 3) * 3 + 1;
const quarterStart = `${now.getUTCFullYear()}-${String(quarterMonth).padStart(2, "0")}-01`;
const from = validDate(argument("--from") ?? quarterStart, "INFOLOBBY_INVALID_FROM");
const to = validDate(argument("--to") ?? today, "INFOLOBBY_INVALID_TO");
if (from > to) throw new Error("INFOLOBBY_INVALID_RANGE");
const outputRoot = resolve(argument("--output") ?? join(root, "data", "lake"));
if (outputRoot === root || dirname(outputRoot) === outputRoot) throw new Error("INVALID_OUTPUT_PATH");

const result = await fetchInfoLobbyBundle({
  from,
  to,
  onProgress(progress) { process.stderr.write(`${JSON.stringify(progress)}\n`); },
});
if (result.records.length === 0) {
  console.warn(JSON.stringify({ warning: "INFOLOBBY_EMPTY_RANGE", from, to, message: "No records returned for the requested range — this is expected for already-processed or low-activity periods." }));
  process.exit(0);
}
const serialized = JSON.stringify(result.records);
if (/"(?:rut|run|rut_persona|rut_personal|domicilio|direccion_particular)"\s*:/i.test(serialized)) {
  throw new Error("INFOLOBBY_PERSONAL_IDENTIFIER_IN_PUBLIC_PROJECTION");
}

const generatedAt = new Date().toISOString();
const existingCatalogPath = join(outputRoot, "catalog", "v1", "manifest.json");
const existingCatalog = existsSync(existingCatalogPath) ? JSON.parse(readFileSync(existingCatalogPath, "utf8")) : null;
const originalAssets = result.originals.flatMap((quarter) => {
  const months = [...new Set(result.records
    .map((record) => record.fecha?.slice(0, 7))
    .filter((period) => period?.startsWith(`${quarter.year}-`))
    .map((period) => Number(period.slice(5, 7)))
    .filter((month) => Math.floor((month - 1) / 3) + 1 === quarter.quarter))];
  return months.flatMap((month) => quarter.datasets.map((dataset) => ({
    sourceId: "infolobby",
    year: quarter.year,
    month,
    name: `infolobby-${quarter.year}-Q${quarter.quarter}-${dataset.dataset}.csv`,
    url: dataset.url,
    checksumSha256: dataset.checksumSha256,
    size: dataset.size,
    license: "CC BY 4.0",
    redistributable: false,
  })));
});
const plan = buildLakePlan({ actualizado_en: generatedAt, fuentes: { infolobby: result.records } }, {
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
  generatedAt,
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
  source: "infolobby",
  from,
  to,
  records: result.records.length,
  eventKinds: Object.fromEntries(["audience", "travel", "gift"].map((kind) => [kind, result.records.filter((record) => record.lobby_event_kind === kind).length])),
  entities: new Set(result.records.flatMap((record) => record.entities ?? []).map((entity) => entity.id)).size,
  legalRuts: new Set(result.records.flatMap((record) => record.entities ?? []).map((entity) => entity.rut_juridico).filter(Boolean)).size,
  quarters: result.originals.map((quarter) => ({ year: quarter.year, quarter: quarter.quarter, checksumSha256: quarter.checksumSha256 })),
  assets: plan.assets.length,
  output: outputRoot,
}, null, 2));
