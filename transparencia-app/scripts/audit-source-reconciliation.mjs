import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { mergeLocalHealth, productionSourcesPayload, reconcileSourceSnapshots } from "../lib/source-reconciliation.mjs";

const DEFAULT_PRODUCTION_URL = "https://cambiometro.impulsacv.cl/api/v1/sources";
const DEFAULT_LOCAL_CATALOG = "data/lake/catalog/v1/manifest.json";
const DEFAULT_LOCAL_HEALTH = "data/etl/source-health.json";

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(path), "utf8"));
}

async function main() {
  const productionUrl = option("--production-url", DEFAULT_PRODUCTION_URL);
  const localCatalogPath = option("--local-catalog", DEFAULT_LOCAL_CATALOG);
  const localHealthPath = option("--local-health", DEFAULT_LOCAL_HEALTH);
  const output = option("--output", null);
  const response = await fetch(productionUrl, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`PRODUCTION_SOURCES_HTTP_${response.status}`);

  const [productionPayload, localCatalog, localHealth] = await Promise.all([
    response.json(),
    readJson(localCatalogPath),
    readJson(localHealthPath),
  ]);
  const report = reconcileSourceSnapshots({
    production: productionSourcesPayload(productionPayload),
    local: mergeLocalHealth(localCatalog, localHealth),
  });
  const document = {
    schemaVersion: 1,
    generatedAt: report.generatedAt,
    productionUrl,
    localCatalog: resolve(localCatalogPath),
    localHealth: resolve(localHealthPath),
    classificationLegend: {
      match: "Los conteos coinciden y no hay componentes locales separados.",
      freshness: "Producción tiene una publicación más nueva que el snapshot local; no se marca como pérdida.",
      scope: "Producción y local tienen alcances o categorías distintas; revisar el desglose antes de calcular cobertura.",
      unexplained: "La evidencia disponible no permite explicar la diferencia.",
      healthMismatch: "El conteo derivado de source-health no coincide con el conteo canónico del catálogo; indica snapshot desfasado o una categoría distinta, no pérdida automática de datos.",
    },
    ...report,
  };
  if (output) await writeFile(resolve(output), `${JSON.stringify(document, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(document, null, 2));
}

main().catch((error) => {
  console.error(`[audit-source-reconciliation] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
