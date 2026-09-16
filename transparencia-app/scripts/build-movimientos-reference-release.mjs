/**
 * Reconcilia el corte público de Movimientos con fuentes visibles para el
 * usuario. No consulta un agregador de terceros: conserva las fuentes de
 * prensa del snapshot versionado y agrega reemplazos sólo cuando existe una
 * relación documentada en el material auditado.
 *
 * Es un release manual de seguridad. El ETL diario no debe reemplazarlo hasta
 * que exista una nueva conciliación aprobada.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const SOURCE_CUTOFF = "2026-09-14";
const RELEASE_ID = "kast-2026-succession-reconciled-2026-09-14";
const OLD_RELEASE_ID = "kast-2026-exits-46-cutoff-2026-09-14";

const normalize = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const sha256 = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

const replacements = new Map([
  ["sebastian urrejola", { name: "María Soledad Berríos (Subrogante)", evidence: "public_record" }],
  ["natalia duco", { name: "Francisco Riveros Cantuarias", evidence: "official" }],
  ["andres otero", { name: "Sofía Rengifo Ottone", evidence: "official" }],
  ["evelyn bintrup", { name: "Fernanda Robles Inostroza", evidence: "official", source: { nivel: "oficial", medio: "Ministerio de Salud de Chile", url: "https://www.minsal.cl/ministerio-de-salud-designa-nueva-seremi-de-la-region-de-los-lagos/", fecha: "2026-09-07", titulo: "Ministerio de Salud designa nueva seremi de la Región de Los Lagos" } }],
  ["patricio ponce", { name: "María José Díaz Hernández (Subrogante)", evidence: "public_record", source: { nivel: "prensa", medio: "Emol", url: "https://www.emol.com/noticias/Nacional/2026/07/27/1206848/renuncia-seremi-vivienda-patricio-ponce.html", fecha: "2026-07-27", titulo: "La subrogancia de la Seremi de Vivienda del Maule la asumirá María José Díaz Hernández" } }],
  ["juan pablo rodriguez", { name: "Sebastián Vallebona Espinosa", evidence: "public_record", source: { nivel: "prensa", medio: "El País", url: "https://elpais.com/chile/2026-08-10/kast-designa-a-un-nuevo-subsecretario-de-hacienda-tras-descartar-a-juan-pablo-rodriguez-destituido-tras-dar-positivo-en-un-test-de-drogas.html", fecha: "2026-08-10", titulo: "Sebastián Vallebona Espinosa es designado subsecretario de Hacienda" } }],
  ["eduardo leiva", { name: "Karen Lindh Aguilar", evidence: "public_record", source: { nivel: "prensa", medio: "BioBioChile", url: "https://www.biobiochile.cl/noticias/nacional/region-de-los-lagos/2026/08/05/gobierno-anuncia-a-karen-lindh-como-nueva-seremi-de-las-culturas-de-la-region-de-los-lagos.shtml", fecha: "2026-08-05", titulo: "Karen Lindh Aguilar asume como seremi de las Culturas de Los Lagos" } }],
  ["marcelo vergara", { name: "Romina Cifuentes (Subrogante)", evidence: "public_record", source: { nivel: "prensa", medio: "Emol", url: "https://www.emol.com/noticias/Nacional/2026/07/18/1206023/seremi-hacienda-arica-presenta-renuncia.html", fecha: "2026-07-18", titulo: "Romina Cifuentes asumirá la subrogancia de Hacienda en Arica y Parinacota" } }],
  ["andres jouannet", { name: "Pilar Giannini Bravo", evidence: "public_record" }],
  ["antaris varela", { name: "Michelle Vera Machuca", evidence: "public_record", source: { nivel: "prensa", medio: "BioBioChile", url: "https://www.biobiochile.cl/noticias/nacional/region-del-bio-bio/2026/08/03/designan-a-michelle-vera-pcc-como-nueva-seremi-de-la-mujer-del-bio-bio.shtml", fecha: "2026-08-03", titulo: "Michelle Vera Machuca es designada seremi de la Mujer del Biobío" } }],
  ["ana victoria quintana", { name: "Gonzalo Guerrero Valle", evidence: "public_record" }],
  ["trinidad steinert", { name: "Martín Arrau García-Huidobro", evidence: "public_record" }],
  ["mara sedini", { name: "Claudio Alvarado Andrade (Biministro Interior–Segegob)", evidence: "official" }],
  ["jorge heiden", { name: "Christopher Pizarro Schmauck", evidence: "official", source: { nivel: "oficial", medio: "Ministerio de Agricultura de Chile", url: "https://minagri.gob.cl/region-de-arica-y-parinacota/", fecha: "2026-08-04", titulo: "Asume nueva seremi de Agricultura en la región de Arica y Parinacota" } }],
  ["daniela castro", { name: "Marcia Raphael Mora", evidence: "public_record", source: { nivel: "prensa", medio: "BioBioChile", url: "https://www.biobiochile.cl/noticias/nacional/chile/2026/06/16/kast-nombra-como-nueva-subsecretaria-de-la-mujer-a-marcia-raphael-rn-tras-remocion-de-daniela-castro.shtml", fecha: "2026-06-16", titulo: "Marcia Raphael es nombrada subsecretaria de la Mujer en reemplazo de Daniela Castro" } }],
  ["jorge carrillo", { name: "Gustavo Rojas (Subrogante)", evidence: "official", source: { nivel: "oficial", medio: "Ministerio de Salud de Chile", url: "https://www.minsal.cl/ministra-s-de-salud-solicita-renuncia-al-seremi-de-nuble/", fecha: "2026-06-12", titulo: "Gustavo Rojas asume como seremi de Salud de Ñuble subrogante" } }],
  ["rafael araos", { name: "Carolina Rossi Pantoja (s)", evidence: "public_record" }],
  ["camila alonso", { name: "Patricio Martínez Quinzacara", evidence: "official", source: { nivel: "oficial", medio: "Biblioteca del Congreso Nacional / Ley Chile", url: "https://www.bcn.cl/leychile/navegar?idNorma=1227314", fecha: "2026-08-20", titulo: "Decreto 44: nombra a Patricio Martínez Quinzacara como seremi de Bienes Nacionales de Antofagasta" } }],
  ["aldo ibani", { name: "Carlos Zamora (Subrogante)", evidence: "public_record", source: { nivel: "prensa", medio: "T13", url: "https://www.t13.cl/amp/noticia/politica/seremi-valparaiso-renuncia-tras-cuestionamientos-por-su-idoneidad-cargo-5-4-2026", fecha: "2026-04-05", titulo: "Carlos Zamora asume como seremi de Salud de Valparaíso subrogante" } }],
  ["jorge salazar", { name: "Ulises Rivera García", evidence: "official", source: { nivel: "oficial", medio: "Ministerio de Obras Públicas de Chile", url: "https://losrios.mop.gob.cl/ingeniero-valdiviano-ulises-rivera-asumio-como-nuevo-seremi-de-obras-publicas-en-los-rios/", fecha: "2026-07-10", titulo: "Ulises Rivera asume como nuevo seremi de Obras Públicas de Los Ríos" } }],
  ["alexander nanjari", { name: "Teresa Carrasco Molina", evidence: "official", source: { nivel: "oficial", medio: "Delegación Presidencial Regional del Biobío", url: "https://www.dprbiobio.dpr.gob.cl/2026/07/29/a-estudiantes-de-alto-biobio-delegado-presidencial-julio-anativia-y-seremi-de-educacion-teresa-carrasco-entregan-85-computadores-del-programa-becas-tic/", fecha: "2026-07-29", titulo: "Teresa Carrasco ejerce como seremi de Educación del Biobío" } }],
  ["patricia dinamarca", { name: "Dalmiro Yáñez Martínez", evidence: "official", source: { nivel: "oficial", medio: "Ministerio de Educación de Chile", url: "https://www.mineduc.cl/organigrama/mineduc/", fecha: "2026-04-06", titulo: "Dalmiro Yáñez Martínez figura como seremi de Educación de Los Lagos" } }],
  ["alonso velasquez", { name: "Godeliver Arriagada González (Subrogante)", evidence: "public_record", source: { nivel: "prensa", medio: "BioBioChile", url: "https://www.biobiochile.cl/noticias/nacional/region-de-tarapaca/2026/09/03/racha-de-salidas-suma-un-nuevo-capitulo-renuncia-seremi-de-vivienda-de-tarapaca-el-numero-35.shtml", fecha: "2026-09-03", titulo: "Godeliver Arriagada asume la subrogancia de Vivienda en Tarapacá" } }],
  ["mario sepulveda", { name: "Luis Calderón", evidence: "press" }],
  ["francisco farias", { name: "Juan Pablo Carrasco", evidence: "press" }],
  ["gustavo baehr", { name: "Renato Münster", evidence: "public_record", source: { nivel: "prensa", medio: "BioBioChile", url: "https://www.biobiochile.cl/noticias/servicios/toma-nota/2026/04/21/estos-son-todos-los-seremis-del-gobierno-que-han-renunciado-o-no-pudieron-asumir-ya-van-18-en-total.shtml", fecha: "2026-04-21", titulo: "Renato Münster fue anunciado tras la salida de Gustavo Baehr" } }],
]);

const eventTypeOverrides = new Map([
  ["antaris varela", "nombramiento-fallido"],
  ["mauricio montealegre", "nombramiento-fallido"],
]);

const sourceOverrides = new Map([
  ["cristian cabezas", [{ nivel: "prensa", medio: "Emol", url: "https://www.emol.com/noticias/Nacional/2026/07/27/1206804/seremi-trabajo-tarapaca-denucnias-laboral.html", fecha: "2026-07-27", titulo: "Renuncia de Cristián Cabezas como seremi del Trabajo de Tarapacá" }]],
  ["patricio lohr", [{ nivel: "prensa", medio: "ADN Radio", url: "https://www.adnradio.cl/2026/09/01/gobierno-pide-renuncia-a-seremi-de-transportes-de-arica-tras-denuncia-por-presuntas-presiones-a-funcionaria-de-la-dgac/?outputType=amp", fecha: "2026-09-01", titulo: "Gobierno pide la renuncia de Patricio Löhr como seremi de Transportes de Arica" }]],
]);

const officialEvidence = new Map([
  ["natalia duco", {
    medio: "Ley Chile / Biblioteca del Congreso Nacional",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=1215432",
    titulo: "Decreto que acepta la renuncia de Natalia Duco y nombra a Francisco Riveros",
  }],
  ["andres otero", {
    medio: "Ley Chile / Biblioteca del Congreso Nacional",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=1215435",
    titulo: "Decreto que formaliza el cambio en la Subsecretaría del Deporte",
  }],
  ["mara sedini", {
    medio: "Prensa Presidencia",
    url: "https://prensa.presidencia.cl/comunicado.aspx?id=329127",
    titulo: "Cambio de gabinete en Seguridad y Segegob",
  }],
  ["trinidad steinert", {
    medio: "Prensa Presidencia",
    url: "https://prensa.presidencia.cl/comunicado.aspx?id=329127",
    titulo: "Cambio de gabinete en Seguridad y Segegob",
  }],
]);

function sourceDate(movement) {
  return movement.fecha ?? movement.salio?.fecha ?? SOURCE_CUTOFF;
}

function publicSources(movement) {
  return (movement.fuentes ?? [])
    .filter((source) => source?.url && !/renunciaskast/i.test(`${source.url} ${source.medio}`))
    .filter((source) => source.nivel !== "senal_tercero")
    .map((source) => ({
      ...source,
      titulo: source.titulo || `Fuente pública sobre la salida de ${movement.saliente ?? movement.salio?.nombre ?? "la autoridad"}`,
    }));
}

function reconcileMovement(movement) {
  const key = normalize(movement.saliente ?? movement.salio?.nombre);
  const sources = sourceOverrides.get(key) ?? publicSources(movement);
  const official = officialEvidence.get(key);
  if (official && !sources.some((source) => source.url === official.url)) {
    sources.unshift({
      nivel: "oficial",
      medio: official.medio,
      url: official.url,
      fecha: sourceDate(movement),
      titulo: official.titulo,
    });
  }

  const replacement = replacements.get(key);
  if (replacement?.source && !sources.some((source) => source.url === replacement.source.url)) {
    sources.push(replacement.source);
  }
  const entry = replacement ? { nombre: replacement.name, fecha: sourceDate(movement) } : undefined;
  const hasOfficial = sources.some((source) => source.nivel === "oficial");
  const hasPublicEvidence = sources.some((source) => source.nivel === "prensa" || source.nivel === "semioficial");
  const estado = hasOfficial ? "verificado" : hasPublicEvidence ? "corroborado" : "en_confirmacion";
  const next = {
    ...movement,
    ...(eventTypeOverrides.has(key) ? { tipo_evento: eventTypeOverrides.get(key), tipo: eventTypeOverrides.get(key) } : {}),
    fuentes: sources,
    referencia_externa: {
      releaseId: RELEASE_ID,
      categoria: movement.referencia_externa?.categoria ?? null,
      tipo_fuente: hasOfficial ? "registro_oficial_y_prensa" : "prensa_publicada",
      documento_primario_verificado: hasOfficial,
    },
    estado,
    verificado: hasOfficial,
    documento_pendiente: !hasOfficial,
    fecha_verificacion: hasOfficial ? movement.fecha_verificacion ?? `${sourceDate(movement)}T16:00:00.000Z` : null,
    entro: entry,
    entrante: entry?.nombre,
    reemplazo_estado: entry ? (replacement.evidence === "official" ? "fuente_oficial" : "fuente_publica") : "no_informado_en_fuentes_consultadas",
    fuente: sources.map((source) => `${source.medio} (${source.fecha})`).join(" · "),
  };
  delete next.source_snapshot_url;
  delete next.source_snapshot_cutoff;
  return next;
}

const input = JSON.parse(await readFile(resolve(root, "data", "movimientos.json"), "utf8"));
if (![OLD_RELEASE_ID, RELEASE_ID].includes(input.release_id) || !Array.isArray(input.movimientos) || input.movimientos.length !== 46) {
  throw new Error(`MOVIMIENTOS_RECONCILE_INPUT_INVALID:${input.release_id}:${input.movimientos?.length ?? 0}`);
}

const excludedNames = ["Carolina Arredondo", "Eduardo Vergara", "Ignacia Fernández", "Daniela Dresdner", "José Andrés Herrera", "Patricio Kuhn"];
const movements = input.movimientos
  .filter((movement) => !excludedNames.some((name) => String(movement.saliente ?? movement.salio?.nombre ?? "").includes(name)))
  .map(reconcileMovement);
if (movements.length !== 46) throw new Error(`MOVIMIENTOS_RECONCILE_SCOPE_INVALID:${movements.length}`);
if (movements.some((movement) => movement.fuentes.some((source) => /renunciaskast/i.test(`${source.url} ${source.medio}`)))) {
  throw new Error("MOVIMIENTOS_RECONCILE_THIRD_PARTY_SOURCE_PRESENT");
}

const stats = {
  total_movimientos: movements.length,
  verificados: movements.filter((movement) => movement.estado === "verificado").length,
  corroborados: movements.filter((movement) => movement.estado === "corroborado").length,
  en_confirmacion: movements.filter((movement) => movement.estado === "en_confirmacion").length,
  con_reemplazo: movements.filter((movement) => Boolean(movement.entrante)).length,
  reemplazo_no_informado: movements.filter((movement) => !movement.entrante).length,
  signals_en_confirmacion: 0,
  target_categories: JSON.stringify({ ministers: 3, subsecretaries: 6, seremis: 36, delegados: 1 }),
};

const payload = {
  version: "7.0.0",
  pipeline: "etl_movimientos_autoridades",
  release_id: RELEASE_ID,
  release_status: "published_reconciled",
  release_scope: "kast-2026-exits-with-succession",
  source_snapshot_cutoff: SOURCE_CUTOFF,
  source_snapshot_type: "fuentes_publicas_y_prensa",
  last_run: "2026-09-15T00:00:00.000Z",
  last_attempt_at: "2026-09-15T00:00:00.000Z",
  last_success_at: "2026-09-15T00:00:00.000Z",
  last_event_date: SOURCE_CUTOFF,
  frecuencia: "Corte reconciliado; actualización por revisión de fuentes públicas",
  source_health: [{ id: "public-records-and-press", label: "Registros públicos y prensa", tier: "public", ok: true }],
  signals: [],
  stats,
  movimientos: movements,
};
payload.checksum_sha256 = sha256(payload);
await writeFile(resolve(root, "data", "movimientos.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, releaseId: RELEASE_ID, count: movements.length, stats, checksum: payload.checksum_sha256 }, null, 2));
