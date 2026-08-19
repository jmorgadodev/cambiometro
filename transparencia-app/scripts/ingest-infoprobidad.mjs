import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchInfoProbidadBundle } from "./etl/connectors/cplt.mjs";
import { buildLakePlan } from "./etl/lake.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const today = new Date().toISOString().slice(0, 10);
const from = argument("--from") ?? `${today.slice(0, 4)}-01-01`;
const to = argument("--to") ?? today;
const concurrency = Number(argument("--concurrency") ?? 2);
const outputRoot = resolve(argument("--output") ?? join(root, "data", "lake"));
if (outputRoot === root || dirname(outputRoot) === outputRoot) throw new Error("INVALID_OUTPUT_PATH");

const result = await fetchInfoProbidadBundle({
  from,
  to,
  concurrency,
  onProgress(progress) { process.stderr.write(`${JSON.stringify(progress)}\n`); },
});
if (result.records.length === 0) throw new Error("INFOPROBIDAD_EMPTY_RANGE");
const serialized = JSON.stringify(result.records);
if (/"(?:domicilio|direccion_particular|placa_patente)"\s*:/i.test(serialized)) {
  throw new Error("INFOPROBIDAD_PERSONAL_IDENTIFIER_IN_PUBLIC_PROJECTION");
}

const generatedAt = new Date().toISOString();
const existingCatalogPath = join(outputRoot, "catalog", "v1", "manifest.json");
const existingCatalog = existsSync(existingCatalogPath) ? JSON.parse(readFileSync(existingCatalogPath, "utf8")) : null;
const originalAssets = result.originals.flatMap((original) => original.pages.map((page) => ({
  sourceId: "infoprobidad",
  year: original.year,
  month: original.month,
  name: `infoprobidad-${original.year}-${String(original.month).padStart(2, "0")}-sparql-${String(page.offset).padStart(6, "0")}.json`,
  url: original.url,
  checksumSha256: page.checksumSha256,
  size: page.size,
  license: "Información pública oficial; redistribución del original no presumida",
  redistributable: false,
})));
const plan = buildLakePlan({ actualizado_en: generatedAt, fuentes: { infoprobidad: result.records } }, {
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
  source: "infoprobidad",
  from,
  to,
  records: result.records.length,
  people: new Set(result.records.flatMap((record) => record.subject_entity_ids ?? [])).size,
  organizations: new Set(result.records.flatMap((record) => record.entities ?? []).filter((entity) => entity.kind === "public_body").map((entity) => entity.id)).size,
  legalRuts: new Set(result.records.flatMap((record) => record.entities ?? []).map((entity) => entity.rut_juridico).filter(Boolean)).size,
  periods: result.originals.map((original) => ({ year: original.year, month: original.month, pages: original.pages.length, checksumSha256: original.checksumSha256 })),
  assets: plan.assets.length,
  output: outputRoot,
}, null, 2));
