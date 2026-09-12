import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
<<<<<<< HEAD
import { catalogSourceCount, transferReleaseCount } from "../lib/source-health.mjs";
import { buildParliamentSourceHealth } from "./source-health-counts.mjs";

const root = resolve(import.meta.dirname, "..");
const read = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const readOptional = (path) => {
  try {
    return JSON.parse(readFileSync(join(root, path), "utf8"));
  } catch {
    return null;
  }
};
const catalog = read("data/lake/catalog/v1/manifest.json");
const cplt = read("data/lake-cplt/projections/funcionarios-v1/manifest.json");
const presupuesto = read("data/lake/projections/v1/presupuesto.json");
const ley19862 = read("data/lake/projections/v1/ley19862-summary.json");
const chilecompra = read("data/lake/projections/v1/chilecompra.json");
const sinim = read("data/lake/projections/v1/sinim.json");
const municipalities = read("data/municipalidades-list.json");
const transferRelease = readOptional(".ci-data-version/transfer-api-manifest.json");
const source = new Map(catalog.sources.map((item) => [item.id, item]));
const count = (...ids) => ids.reduce((sum, id) => sum + (source.get(id)?.recordCount ?? 0), 0);
const canonicalCount = (sourceId, fallback) => catalogSourceCount(source, sourceId, fallback);
const publicTransferRows = transferReleaseCount(transferRelease, ley19862.kpis.total_transfers);
const parliament = buildParliamentSourceHealth(catalog);
const generatedAt = new Date(Math.max(...[catalog.generatedAt, cplt.generatedAt, presupuesto.generatedAt, ley19862.generatedAt, chilecompra.generatedAt].map((value) => new Date(value).getTime()).filter(Number.isFinite))).toISOString();
const latestExpense = presupuesto.programs.filter((program) => program.budgetSide === "expense").map((program) => program.meses?.at(-1)?.vigente).filter((value) => Number.isSafeInteger(value));

const health = {
  generatedAt,
  sources: {
    cplt: { recordCount: cplt.recordCount, status: "partial", generatedAt: cplt.generatedAt },
    dipres: { recordCount: canonicalCount("dipres", presupuesto.count), financialAmountClp: latestExpense.length ? latestExpense.reduce((sum, value) => sum + value, 0) : null, status: source.get("dipres")?.status ?? "partial", generatedAt: presupuesto.generatedAt },
    ley19862: {
      recordCount: publicTransferRows,
      catalogRecordCount: source.get("ley-19862")?.recordCount ?? null,
      financialAmountClp: ley19862.kpis.total_monto_clp,
      status: source.get("ley-19862")?.status ?? "partial",
      generatedAt: transferRelease?.generatedAt ?? ley19862.generatedAt,
    },
    chilecompra: { recordCount: canonicalCount("chilecompra", chilecompra.buyers.reduce((sum, buyer) => sum + (buyer.procesos ?? 0), 0)), financialAmountClp: chilecompra.total_adjudicado_clp ?? null, status: source.get("chilecompra")?.status ?? "partial", generatedAt: chilecompra.generatedAt },
    infolobby: { recordCount: count("infolobby"), status: source.get("infolobby")?.status ?? "partial", generatedAt: catalog.generatedAt },
    infoprobidad: { recordCount: count("infoprobidad"), status: source.get("infoprobidad")?.status ?? "partial", generatedAt: catalog.generatedAt },
    sinim: { recordCount: count("sinim"), coverageCount: sinim.total, coverageUniverse: municipalities.length, status: source.get("sinim")?.status ?? "partial", generatedAt: sinim.generatedAt },
    // El Censo 2024 se materializa en las fichas comunales, no como una
    // partición del lago. Debe seguir figurando en el catálogo operativo para
    // que la API, la landing y el dashboard de calidad compartan el universo.
    ine: { recordCount: municipalities.length, coverageCount: municipalities.length, coverageUniverse: municipalities.length, status: "complete", generatedAt: catalog.generatedAt },
    contraloria: { recordCount: count("contraloria"), status: source.get("contraloria")?.status ?? "partial", generatedAt: catalog.generatedAt },
    // Cámara y Senado conservan el conteo principal separado de gastos,
    // asistencia y votaciones. Sumarlos hacía parecer que una fuente tenía
    // más registros de los que realmente correspondían a su categoría y
    // desalineaba source-health respecto del catálogo R2 que usa la API.
    camara: {
      recordCount: source.get("camara")?.recordCount ?? parliament.camara.recordCount,
      status: source.get("camara")?.status ?? "partial",
      generatedAt: catalog.generatedAt,
      components: parliament.camara.components,
    },
    senado: {
      recordCount: source.get("senado")?.recordCount ?? parliament.senado.recordCount,
      status: source.get("senado")?.status ?? "partial",
      generatedAt: catalog.generatedAt,
      components: parliament.senado.components,
    },
    servel: { recordCount: count("servel"), status: source.get("servel")?.status ?? "partial", generatedAt: catalog.generatedAt },
  },
};

const healthSourceCount = Object.keys(health.sources).length;
if (healthSourceCount < 12 || health.sources.ine.recordCount !== municipalities.length) {
  throw new Error(`SOURCE_HEALTH_INCOMPLETE: expected at least 12 sources including INE, got ${healthSourceCount}`);
}

const output = join(root, "data", "etl", "source-health.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(health, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, generatedAt, sources: healthSourceCount }, null, 2));
