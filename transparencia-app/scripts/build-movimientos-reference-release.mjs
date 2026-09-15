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
  ["andres jouannet", { name: "Pilar Giannini Bravo", evidence: "public_record" }],
  ["ana victoria quintana", { name: "Gonzalo Guerrero Valle", evidence: "public_record" }],
  ["trinidad steinert", { name: "Martín Arrau García-Huidobro", evidence: "public_record" }],
  ["mara sedini", { name: "Claudio Alvarado Andrade (Biministro Interior–Segegob)", evidence: "official" }],
  ["rafael araos", { name: "Carolina Rossi Pantoja (s)", evidence: "public_record" }],
  ["mario sepulveda", { name: "Luis Calderón", evidence: "press" }],
  ["francisco farias", { name: "Juan Pablo Carrasco", evidence: "press" }],
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
  const sources = publicSources(movement);
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
  const entry = replacement ? { nombre: replacement.name, fecha: sourceDate(movement) } : undefined;
  const hasOfficial = sources.some((source) => source.nivel === "oficial");
  const hasPublicEvidence = sources.some((source) => source.nivel === "prensa" || source.nivel === "semioficial");
  const estado = hasOfficial ? "verificado" : hasPublicEvidence ? "corroborado" : "en_confirmacion";
  const next = {
    ...movement,
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
if (input.release_id !== OLD_RELEASE_ID || !Array.isArray(input.movimientos) || input.movimientos.length !== 46) {
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
