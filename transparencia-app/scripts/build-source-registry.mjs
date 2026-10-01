import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeFileAtomic } from "./etl/safe-file.mjs";

const connectorRoot = "scripts/etl/connectors/";
const binding = (ids, categories, connector, file, url) => ({ ids, categories, connector, file, url });
// These are bindings to existing publishers, not claims of complete coverage.
/** @type {Record<string, {ids: string[], categories: string[], connector: string, file: string|null, url?: string}>} */
export const SOURCE_BINDINGS = {
  "etl-daily.yml": binding(["camara", "gastos_camara"], ["nómina", "gastos", "asistencia"], "scripts/etl.mjs", "data/politicos-votaciones.json", "https://opendata.congreso.cl/wscamaradiputados.asmx"),
  "etl-camara-votaciones.yml": binding(["camara"], ["votaciones Cámara; catálogo compartido"], "scripts/etl.mjs", "data/politicos-votaciones.json", "https://opendata.camara.cl/camaradiputados/WServices/WSLegislativo.asmx; https://opendata.congreso.cl/wscamaradiputados.asmx/getVotaciones_Boletin"),
  "etl-personal-apoyo.yml": binding([], ["apoyo Cámara"], "scripts/etl-personal-apoyo.mjs", "data/personal-apoyo.json", "https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId={id}"),
  "etl-personal-apoyo-senado.yml": binding([], ["apoyo Senado"], "scripts/etl-personal-apoyo.mjs", "data/personal-apoyo.json", "https://web-back.senado.cl/api/transparency/senator-assignments/support-staff"),
  "etl-movimientos.yml": binding([], ["anuncios", "confirmaciones", "salidas"], "scripts/movimientos-pipeline.mjs", "data/movimientos.json", "scripts/movimientos-pipeline.mjs#MOVIMIENTOS_SOURCES; MOVIMIENTOS_PROVISIONAL_SOURCES en workflow"),
  "etl-chilecompra.yml": binding(["chilecompra"], ["compras"], `${connectorRoot}chilecompra.mjs`, "data/lake/projections/v1/chilecompra.json", "https://api.mercadopublico.cl/APISOCDS/OCDS"),
  "etl-infolobby-scheduled.yml": binding(["infolobby"], ["audiencias", "viajes", "donativos"], `${connectorRoot}cplt.mjs`, "data/lake/projections/v1/infolobby.json", "https://www.infolobby.cl/DatosAbiertos/Catalogos/VirtuosoLobby"),
  "etl-contraloria.yml": binding(["contraloria"], ["auditorías"], `${connectorRoot}contraloria.mjs`, "data/lake/projections/v1/contraloria.json", "https://www.contraloria.cl/apibusca/search/consolidados"),
  "etl-cplt.yml": binding(["transparencia-activa"], ["nóminas municipales; índice externo"], "scripts/etl/stream-remote-personal.mjs", "data/municipalidades-data.json", "https://consejotransparencia.cl/transparencia_activa/datoabierto/archivos; https://www.cplt.cl/transparencia_activa/datoabierto/archivos"),
  "etl-ley-19862.yml": binding(["ley-19862"], ["transferencias"], `${connectorRoot}ley-19862.mjs`, "data/lake/projections/v1/ley19862-summary.json", "https://registros19862.gob.cl/reporte/transferencias"),
  "etl-infoprobidad.yml": binding(["infoprobidad"], ["declaraciones"], `${connectorRoot}cplt.mjs`, "data/lake/projections/v1/infoprobidad.json", "https://datos.cplt.cl/sparql"),
  "etl-dipres.yml": binding(["dipres"], ["presupuesto agregado"], `${connectorRoot}dipres.mjs`, "data/lake/projections/v1/presupuesto.json", "https://www.dipres.gob.cl/597/w3-multipropertyvalues-25910-37782.html"),
  "etl-sinim.yml": binding(["sinim"], ["indicadores comunales"], `${connectorRoot}sinim.mjs`, "data/lake/projections/v1/sinim.json", "https://datos.sinim.gov.cl/datos_municipales/obtener_datos_municipales.php"),
  "etl-expenses.yml": binding(["gastos_senado"], ["gastos Senado"], `${connectorRoot}senado.mjs`, "data/lake-subsets/gastos-senado.subset.json", "https://web-back.senado.cl/api/transparency/expenses/senator-Operational-expenses"),
  "etl-remuneraciones-38bis.yml": binding([], ["remuneraciones 38 bis"], "scripts/etl/remuneraciones-38bis-parser.mjs", null, "https://comision38bis.gob.cl/registro-publico?csv-todo; projections/remuneraciones-38bis-v1/manifest.json"),
  "etl-servel.yml": binding(["servel"], ["resultados electorales"], `${connectorRoot}servel.mjs`, "data/lake/projections/v1/servel.json", "https://www.servel.cl/resultados-preliminares-eleccion-presidencial-y-parlamentarias-2025/"),
  "etl-camara-reconciliation.yml": binding(["camara", "gastos_camara"], ["histórico Cámara"], "scripts/etl.mjs", "data/politicos-votaciones.json", "https://opendata.congreso.cl/wscamaradiputados.asmx"),
  "etl-cplt-central.yml": binding([], ["nóminas centrales; índice externo"], "scripts/etl/stream-remote-personal.mjs", null, "https://consejotransparencia.cl/transparencia_activa/datoabierto/archivos; https://www.cplt.cl/transparencia_activa/datoabierto/archivos"),
};

function unique(items, key) {
  const ids = items.map((item) => item[key]);
  if (new Set(ids).size !== ids.length) throw new Error(`DUPLICATE_${key}`);
}

export function buildSourceRegistry({ calendar, bindings = SOURCE_BINDINGS, workflows, catalog, staticManifest }) {
  unique(calendar.entries, "workflow");
  unique(catalog.sources, "id");
  unique(staticManifest.files, "path");
  const makeRow = (entry, bound, mode) => {
    const artifact = staticManifest.files.find((file) => file.path === bound.file);
    if (artifact && (!/^[a-f0-9]{64}$/.test(artifact.checksumSha256) || !artifact.key.startsWith("projections/static-site-v1/releases/"))) throw new Error("INVALID_ARTIFACT_CHECKSUM_OR_KEY");
    return {
      id: entry.workflow ?? "votaciones_senado", name: entry.name, workflow: entry.workflow,
      mode, cronUtc: entry.cronUtc, frequency: entry.local, categories: bound.categories,
      connector: bound.connector, configuredOrigin: bound.url ?? null,
      state: mode === "local-only" ? "paused_local_only" : "unverified",
      coverage: "no medida", freshnessLimit: null,
      windowEvidence: (workflows[entry.workflow] ?? "").split("\n").filter((line) => /--from|--to|--year|--month|full.history|days ago|months ago/.test(line)).map((line) => line.trim()),
      catalog: bound.ids.map((id) => {
        const source = catalog.sources.find((item) => item.id === id);
        if (source?.indexChecksumSha256 && !/^[a-f0-9]{64}$/.test(source.indexChecksumSha256)) throw new Error("INVALID_CATALOG_CHECKSUM");
        if (source && (!Number.isSafeInteger(source.recordCount) || source.recordCount < 0)) throw new Error("INVALID_CATALOG_COUNT");
        return { id, recordCount: source?.recordCount ?? null, periods: source?.foundPeriods ?? [], checksum: source?.indexChecksumSha256 ?? null, status: source?.status ?? "no medido", countScope: "catalog-source; no sumar filas de distintos workflows" };
      }),
      artifact: artifact ? { path: artifact.path, releaseKey: artifact.key, checksum: artifact.checksumSha256, bytes: artifact.size ?? null } : null,
      limitation: "Calendario y metadatos no acreditan ejecución sana, universo completo ni conteo de una categoría compartida. Campos ausentes requieren su manifiesto específico; no se sustituyen por cero.",
    };
  };
  const sources = calendar.entries.map((entry) => {
    const bound = bindings[entry.workflow];
    if (!bound) throw new Error(`MISSING_BINDING:${entry.workflow}`);
    const workflow = workflows[entry.workflow] ?? "";
    if (!workflow.includes("workflow_dispatch:") || (entry.cronUtc ? !workflow.includes(`cron: "${entry.cronUtc}"`) : workflow.includes("schedule:"))) throw new Error(`SCHEDULE_MISMATCH:${entry.workflow}`);
    return makeRow(entry, bound, entry.cronUtc ? "scheduled" : "manual");
  });
  sources.push(makeRow({ workflow: null, name: "Votaciones Senado", cronUtc: null, local: "Local; vencimiento no medido" }, { ids: ["votaciones_senado"], categories: ["votaciones Senado"], connector: `${connectorRoot}senado-votaciones.mjs`, file: "data/politicos-votaciones.json", url: "https://tramitacion.senado.cl/wspublico/sesiones.php; https://web-back.senado.cl/api/votes" }, "local-only"));
  const mapped = new Set(sources.flatMap((source) => source.catalog.map((item) => item.id)));
  const unmappedCatalogSources = catalog.sources.filter((source) => !mapped.has(source.id));
  return { schemaVersion: 1, catalogGeneratedAt: catalog.generatedAt ?? null, staticGeneratedAt: staticManifest.generatedAt ?? null, staticManifestChecksum: staticManifest.checksumSha256 ?? null, sources, unmappedCatalogSources };
}

function main() {
  const args = process.argv.slice(2);
  const option = (name) => { const index = args.indexOf(name); if (index < 0 || !args[index + 1]) throw new Error(`REQUIRED:${name}`); return args[index + 1]; };
  const appRoot = fileURLToPath(new URL("../", import.meta.url));
  const repoRoot = resolve(appRoot, "..");
  const json = (path) => JSON.parse(readFileSync(path, "utf8"));
  const calendar = json(resolve(repoRoot, ".github/etl-calendar.json"));
  const workflows = Object.fromEntries(calendar.entries.map((entry) => [entry.workflow, readFileSync(resolve(repoRoot, ".github/workflows", entry.workflow), "utf8")]));
  for (const bound of Object.values(SOURCE_BINDINGS)) readFileSync(resolve(appRoot, bound.connector), "utf8");
  const report = buildSourceRegistry({ calendar, workflows, catalog: json(option("--catalog")), staticManifest: json(option("--static-manifest")) });
  if (args.includes("--output")) writeFileAtomic(resolve(option("--output")), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (args.includes("--markdown")) {
    const text = ["# Registro de fuentes — O03", "", `Catálogo R2: ${report.catalogGeneratedAt}. Manifiesto estático: ${report.staticGeneratedAt}.`,
      `Checksum del manifiesto estático: \`${report.staticManifestChecksum}\`.`, "",
      "Generado desde calendario, conectores referenciados y dos manifiestos R2; no desde snapshots Git. No acredita salud operativa ni cobertura completa. No se suman catálogos compartidos. Sin denominador, cobertura no medida. Un campo ausente no equivale a cero.", "",
      "| Fuente / workflow | Modalidad / calendario UTC | Categorías | Conteo del catálogo (no de personas) / períodos | Artefacto / checksum |", "| --- | --- | --- | --- | --- |",
      ...report.sources.map((row) => `| ${row.name} / ${row.workflow ?? "sin workflow remoto"} | ${row.mode} / ${row.cronUtc ?? "no aplica"} | ${row.categories.join(", ")} | ${row.catalog.map((item) => `${item.id}: ${item.recordCount ?? "no medido"}; ${item.periods.length ? `${item.periods[0]} a ${item.periods.at(-1)} (${item.periods.length} cortes; no asegura continuidad)` : "períodos no medidos"}; checksum índice ${item.checksum ?? "no medido"}`).join("<br>") || "No medido en este catálogo"} | ${row.artifact ? `\`${row.artifact.path}\` / checksum \`${row.artifact.checksum}\` / release \`${row.artifact.releaseKey.split("/")[3]}\`` : "Manifiesto específico pendiente; no medido"} |`), "",
      "## Procedencia y reproducción", "",
      ...report.sources.map((row) => `- **${row.name}:** \`${row.connector}\`; origen configurado: ${row.configuredOrigin}.`), "",
      "El JSON reproducible conserva el puntero versionado, checksum de índice, períodos exactos y líneas del workflow sobre la ventana extraída. Estado operativo unverified (no se consultó la fuente); Senado votaciones paused_local_only. Frescura máxima no medida. Los manifiestos de índices CPLT, apoyo y 38 bis requieren su verificación individual; el catálogo agregado no los reemplaza.", "",
      `Entradas del catálogo sin workflow asociado: ${report.unmappedCatalogSources.map((source) => `${source.id} (${source.recordCount} filas de catálogo; ${source.indexChecksumSha256 ?? "checksum no medido"})`).join(", ") || "ninguna"}. No se les inventa calendario ni estado sano.`, "",
      "Desde transparencia-app: `node scripts/build-source-registry.mjs --catalog <catalog-R2.json> --static-manifest <static-R2.json> --output <registro.json> --markdown <matriz.md>`. Entradas descargadas por lectura acotada; el generador no usa red, D1 ni escribe R2. Pruebas: `npx vitest run lib/source-registry.test.ts`.", ""];
    writeFileAtomic(resolve(option("--markdown")), text.join("\n"), "utf8");
  }
  console.log(JSON.stringify({ sources: report.sources.length, catalogGeneratedAt: report.catalogGeneratedAt, staticManifestChecksum: report.staticManifestChecksum }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
