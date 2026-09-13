import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchSenateDomesticTickets, fetchSenateForeignMissions } from "./connectors/senado.mjs";
import { buildLakePlan } from "./lake.mjs";
import { stableStringify } from "./core.mjs";

export const REPAIR_DATASETS = new Set(["domestic_tickets", "foreign_missions"]);

function argument(name, fallback = undefined) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function requirePeriod(year, month) {
  if (!/^\d{4}$/.test(String(year)) || !/^\d{2}$/.test(String(month))) throw new Error("SENADO_REPAIR_PERIOD_INVALID");
  const numericMonth = Number(month);
  if (numericMonth < 1 || numericMonth > 12) throw new Error("SENADO_REPAIR_MONTH_INVALID");
  return { year: Number(year), month: numericMonth, period: `${year}-${month}` };
}

function assetMetadata(key, data, releaseTag, releaseAssetName) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return {
    key,
    data: buffer,
    checksumSha256: createHash("sha256").update(buffer).digest("hex"),
    size: buffer.length,
    releaseTag,
    releaseAssetName,
  };
}

function isSenateEntityAsset(key) {
  return key.startsWith("entities/v1/senado-") || key.startsWith("indexes/v1/senado/");
}

/**
 * Construye un paquete local de reparación para una única partición declarada
 * pero ausente. No publica ni elimina objetos remotos; la promoción queda para
 * una revisión explícita del plan generado.
 */
export function buildRepairPlan({ result, existingCatalog, generatedAt }) {
  if (!result || result.sourceId !== "senado" || !REPAIR_DATASETS.has(result.dataset)) {
    throw new Error("SENADO_REPAIR_DATASET_UNSUPPORTED");
  }
  const period = requirePeriod(result.year, String(result.month).padStart(2, "0"));
  const targetId = `senado/${period.year}/${String(period.month).padStart(2, "0")}`;
  const declared = (existingCatalog?.partitions ?? []).find((partition) => partition.id === targetId);
  if (!declared) throw new Error(`SENADO_REPAIR_TARGET_NOT_DECLARED: ${targetId}`);
  if (!Array.isArray(result.records) || result.records.length === 0) throw new Error("SENADO_REPAIR_EMPTY_RESULT");
  if (Number(declared.recordCount) !== result.records.length) {
    throw new Error(`SENADO_REPAIR_COUNT_MISMATCH: declared=${declared.recordCount}; fetched=${result.records.length}`);
  }

  const snapshot = {
    actualizado_en: generatedAt,
    fuentes: { senado: result.records },
  };
  const lakePlan = buildLakePlan(snapshot, { existingCatalog });
  const repaired = lakePlan.catalog.partitions.find((partition) => partition.id === targetId);
  if (!repaired || repaired.recordCount !== result.records.length) throw new Error("SENADO_REPAIR_PLAN_INVALID");

  // El plan sólo debe agregar la partición recuperada. No reemplaza el índice
  // de entidades completo de Senado con el subconjunto de reparación.
  const previousSenate = (existingCatalog.sources ?? []).find((source) => source.id === "senado");
  if (previousSenate) {
    const nextSenate = lakePlan.catalog.sources.find((source) => source.id === "senado");
    if (nextSenate) {
      nextSenate.entityKey = previousSenate.entityKey ?? null;
      nextSenate.entityIndexKey = previousSenate.entityIndexKey ?? null;
      nextSenate.entityCount = previousSenate.entityCount ?? 0;
    }
  }

  const catalogText = `${stableStringify(lakePlan.catalog)}\n`;
  const catalogAsset = assetMetadata(
    "catalog/v1/manifest.json",
    catalogText,
    `data-catalog-v1-${createHash("sha256").update(catalogText).digest("hex").slice(0, 16)}`,
    "manifest.json",
  );
  lakePlan.assets = lakePlan.assets
    .filter((asset) => asset.key !== "catalog/v1/manifest.json" && !isSenateEntityAsset(asset.key));
  lakePlan.assets.push(catalogAsset);

  return {
    catalog: lakePlan.catalog,
    assets: lakePlan.assets,
    publishPlan: {
      schemaVersion: "1.0.0",
      generatedAt,
      repair: { sourceId: "senado", dataset: result.dataset, period: targetId, recordCount: result.records.length },
      assets: lakePlan.assets.map(({ key, checksumSha256, size, releaseTag, releaseAssetName }) => ({ key, checksumSha256, size, releaseTag, releaseAssetName })),
    },
  };
}

async function main() {
  const dataset = argument("--dataset");
  if (!REPAIR_DATASETS.has(dataset)) throw new Error(`SENADO_REPAIR_DATASET_REQUIRED: ${[...REPAIR_DATASETS].join(",")}`);
  const { year, month } = requirePeriod(argument("--year"), argument("--month"));
  const catalogPath = resolve(argument("--catalog", "data/lake/catalog/v1/manifest.json"));
  const outputRoot = resolve(argument("--output", `data/repair-senado-${year}-${String(month).padStart(2, "0")}-${dataset}`));
  if (!existsSync(catalogPath)) throw new Error(`SENADO_REPAIR_CATALOG_MISSING: ${catalogPath}`);
  const existingCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const fetcher = dataset === "domestic_tickets" ? fetchSenateDomesticTickets : fetchSenateForeignMissions;
  const result = await fetcher({ year, month });
  const generatedAt = new Date().toISOString();
  const plan = buildRepairPlan({ result, existingCatalog, generatedAt });

  for (const item of plan.assets) {
    const target = join(outputRoot, item.key);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, item.data);
  }
  writeFileSync(join(outputRoot, "publish-plan.json"), `${JSON.stringify(plan.publishPlan, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    mode: "local-package-only",
    dataset,
    period: `${year}-${String(month).padStart(2, "0")}`,
    records: result.records.length,
    assets: plan.assets.length,
    output: outputRoot,
    targetManifest: `partitions/senado/${year}/${String(month).padStart(2, "0")}/manifest.json`,
  }, null, 2));
}

const entry = process.argv[1] ? resolve(process.argv[1]) : null;
if (entry === fileURLToPath(import.meta.url)) await main();
