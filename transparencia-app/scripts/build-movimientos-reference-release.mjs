/**
 * Genera el release público acotado de salidas del gobierno de 2026.
 *
 * Este script se ejecuta manualmente durante una auditoría. No es parte del
 * ETL diario y no se ejecuta durante un deploy. Toma el corte publicado por
 * el registro externo de seguimiento, excluye eventos posteriores al
 * 14-09-2026 y elimina cualquier supuesto enlace BCN heredado.
 *
 * La fuente externa es una referencia periodística, no un sustituto de un
 * decreto. Por eso las filas se publican como `en_confirmacion` hasta que
 * exista un instrumento primario verificable.
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";

const root = resolve(import.meta.dirname, "..");
const SOURCE_URL = "https://renunciaskast.cl/";
const SOURCE_CUTOFF = "2026-09-14";
const RELEASE_ID = "kast-2026-exits-46-cutoff-2026-09-14";
const months = new Map([
  ["ene", "01"], ["feb", "02"], ["mar", "03"], ["abr", "04"],
  ["may", "05"], ["jun", "06"], ["jul", "07"], ["ago", "08"],
  ["sep", "09"], ["oct", "10"], ["nov", "11"], ["dic", "12"],
]);

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function isoDate(value) {
  const match = String(value ?? "").trim().toLowerCase().match(/^(\d{1,2})\s+([a-záéíóú]+)/u);
  if (!match) throw new Error(`MOVIMIENTOS_REFERENCE_DATE_INVALID:${value}`);
  const month = months.get(match[2].slice(0, 3).normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  if (!month) throw new Error(`MOVIMIENTOS_REFERENCE_MONTH_INVALID:${value}`);
  return `2026-${month}-${match[1].padStart(2, "0")}`;
}

function ministryName(value) {
  const names = {
    "Segegob": "Ministerio Secretaría General de Gobierno",
    "Segpres": "Ministerio Secretaría General de la Presidencia",
    "Mujer": "Ministerio de la Mujer y la Equidad de Género",
    "Ciencia": "Ministerio de Ciencia, Tecnología, Conocimiento e Innovación",
    "Seguridad Pública": "Ministerio de Seguridad Pública",
  };
  return names[value] ?? `Ministerio de ${value}`;
}

function cargoFor(row) {
  if (row.tipo === "Ministra") {
    if (row.min === "Segegob") return "Ministra Secretaria General de Gobierno";
    return `${row.sexo === "m" ? "Ministro" : "Ministra"} de ${row.min}`;
  }
  if (row.tipo === "Subsecretario") {
    const label = row.sexo === "f" ? "Subsecretaria" : "Subsecretario";
    const ministry = row.minLabel?.includes("Prevención del Delito") ? "Prevención del Delito" : row.min;
    return `${label} de ${ministry}`;
  }
  if (row.tipo === "Delegado Provincial") {
    return `${row.sexo === "f" ? "Delegada" : "Delegado"} Presidencial Provincial de ${row.terrLabel ?? row.terr}`;
  }
  return `Seremi de ${row.min} de ${row.terr}`;
}

function eventType(row) {
  const text = `${row.motivo ?? ""} ${row.razon ?? ""}`.toLowerCase();
  if (/cambio de puesto|ascendid/.test(text)) return "cambio-puesto";
  if (/nombrad|nombramiento|designaci/.test(text)) return "nombramiento-fallido";
  if (/removid|cesad|salida pedida|pidió la renuncia/.test(text)) return "remocion";
  return "renuncia";
}

function roleCategory(row) {
  if (row.tipo === "Ministra") return "ministers";
  if (row.tipo === "Subsecretario") return "subsecretaries";
  if (row.tipo === "Seremi") return "seremis";
  if (row.tipo === "Delegado Provincial") return "delegados";
  return null;
}

async function fetchReferenceRows() {
  const response = await fetch(SOURCE_URL, { headers: { "User-Agent": "Cambiometro-MovimientosRelease/1.0" } });
  if (!response.ok) throw new Error(`MOVIMIENTOS_REFERENCE_HTTP_${response.status}`);
  const body = await response.text();
  const match = body.match(/const D = \[(?<rows>[\s\S]*?)\n\];/u);
  if (!match?.groups?.rows) throw new Error("MOVIMIENTOS_REFERENCE_DATA_NOT_FOUND");
  const source = match.groups.rows;
  if (/[;]|=>|\b(?:function|require|process|globalThis|eval)\b/u.test(source)) {
    throw new Error("MOVIMIENTOS_REFERENCE_UNSAFE_DATA_LITERAL");
  }
  return vm.runInNewContext(`[${source}]`, Object.create(null), { timeout: 500 });
}

function normalizeRow(row, index) {
  const fecha = isoDate(row.fecha);
  const category = roleCategory(row);
  const idName = String(row.n).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const event = eventType(row);
  const sourceTitle = `Registro de salida de ${row.n} (${row.fecha})`;
  const sources = [
    {
      nivel: "senal_tercero",
      medio: "Renuncias Kast · registro de seguimiento",
      url: SOURCE_URL,
      fecha,
      titulo: sourceTitle,
    },
  ];
  if (row.url) {
    sources.push({ nivel: "prensa", medio: row.medio ?? "Fuente de prensa", url: row.url, fecha, titulo: sourceTitle });
  }
  return {
    id: `mov-kast-2026-${fecha}-${idName || index}`,
    tipo_evento: event,
    tipo: event,
    cargo: cargoFor(row),
    organismo: row.tipo === "Seremi" ? `Secretaría Regional Ministerial de ${row.min}` : ministryName(row.min),
    ministerio: ministryName(row.min),
    region: row.tipo === "Ministra" || row.tipo === "Subsecretario" ? "Nacional" : row.terr,
    salio: {
      nombre: row.n,
      fecha,
      motivo_categoria: row.motivo ?? "No informado",
      motivo_texto: row.razon ?? "Sin motivo público detallado",
    },
    fuentes: sources,
    estado: "en_confirmacion",
    verificado: false,
    documento_pendiente: true,
    fecha_deteccion: `${fecha}T12:00:00.000Z`,
    fecha_verificacion: null,
    fecha,
    fechaExacta: true,
    organo: row.tipo === "Seremi" ? `Secretaría Regional Ministerial de ${row.min}` : ministryName(row.min),
    saliente: row.n,
    motivo: row.razon ?? row.motivo ?? "Sin motivo público detallado",
    fuente: sources.map((source) => `${source.medio} (${source.fecha})`).join(" · "),
    referencia_externa: {
      releaseId: RELEASE_ID,
      categoria: category,
      tipo_fuente: "referencia_periodistica",
      documento_primario_verificado: false,
    },
  };
}

const rawRows = await fetchReferenceRows();
const rows = rawRows
  .map((row, index) => ({ row, index, fecha: isoDate(row.fecha) }))
  .filter(({ fecha }) => fecha <= SOURCE_CUTOFF)
  .map(({ row, index }) => normalizeRow(row, index));

const counts = rows.reduce((result, row) => {
  const category = row.referencia_externa.categoria;
  result[category] = (result[category] ?? 0) + 1;
  return result;
}, {});
const expected = { ministers: 3, subsecretaries: 6, seremis: 36, delegados: 1 };
const scopeMatches = Object.keys(expected).every((key) => counts[key] === expected[key]);
if (rows.length !== 46 || !scopeMatches) {
  throw new Error(`MOVIMIENTOS_REFERENCE_SCOPE_INVALID:${JSON.stringify({ total: rows.length, counts })}`);
}

const payload = {
  version: "6.0.0",
  pipeline: "etl_movimientos_autoridades",
  release_id: RELEASE_ID,
  release_status: "published_reference_pending_primary_docs",
  release_scope: "kast-2026-exits",
  source_snapshot_url: SOURCE_URL,
  source_snapshot_cutoff: SOURCE_CUTOFF,
  source_snapshot_type: "referencia_periodistica",
  last_run: "2026-09-15T00:00:00.000Z",
  last_attempt_at: "2026-09-15T00:00:00.000Z",
  last_success_at: "2026-09-15T00:00:00.000Z",
  last_event_date: "2026-09-14",
  frecuencia: "Manual hasta reconciliación de documentos primarios",
  source_health: [{ id: "renunciaskast-reference", label: "Referencia externa de seguimiento", tier: "reference", ok: true, url: SOURCE_URL }],
  signals: [],
  stats: {
    total_movimientos: 46,
    verificados: 0,
    en_confirmacion: 46,
    aun_no_confirmado: 0,
    signals_en_confirmacion: 46,
    target_categories: JSON.stringify(expected),
  },
  movimientos: rows,
};
payload.checksum_sha256 = sha256(payload);
await mkdir(resolve(root, "data"), { recursive: true });
await writeFile(resolve(root, "data", "movimientos.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, releaseId: RELEASE_ID, count: rows.length, counts, checksum: payload.checksum_sha256 }, null, 2));
