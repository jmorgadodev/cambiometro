/**
 * Pipeline build-time de fuentes oficiales.
 *
 * Descarga por rango, valida trazabilidad y conserva el último bloque válido de
 * una fuente cuando ésta falla. No genera datos simulados ni limita registros.
 *
 * Uso:
 *   node scripts/etl.mjs
 *   node scripts/etl.mjs --dry-run --from 2026-08-01 --to 2026-08-31
 *   node scripts/etl.mjs --source infoprobidad,infolobby
 */

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchInfoLobby, fetchInfoProbidad } from "./etl/connectors/cplt.mjs";
import { mergeLakeProjections } from "./etl/merge-lake-projections.mjs";
import {
  discoverLatestSenateExpensePeriod,
  fetchSenateOperationalExpenses,
} from "./etl/connectors/senado.mjs";
import { fetchVotacionesSenado } from "./etl/connectors/senado-votaciones.mjs";
import { assertSuccessfulRun } from "./etl/validation.mjs";
import { readJsonIfPresent, writeFileAtomic } from "./etl/safe-file.mjs";
import { mergeRecordsById } from "./etl/history.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const dataDirectory = join(scriptDirectory, "..", "data", "etl");
const latestPath = join(dataDirectory, "latest.json");
const statusPath = join(dataDirectory, "status.json");

const USER_AGENT = "Cambiometro-ETL/1.0 (+https://cambiometro.impulsacv.cl)";
const REQUEST_TIMEOUT_MS = 30_000;
const BULK_REQUEST_TIMEOUT_MS = 180_000;
const DRY_RUN = process.argv.includes("--dry-run");
const SOURCE_KEYS = new Set(["infoprobidad", "infolobby", "camara", "votaciones_camara", "votaciones_senado", "gastos_senado", "gastos_camara"]);
const PERIODO_ACTUAL_DESDE = "2026-03-11";

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function assertIsoDate(value, name) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`${name} debe usar formato YYYY-MM-DD`);
  }
  return value;
}

function parseOptions() {
  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const from = assertIsoDate(readArgument("--from") ?? defaultFrom, "--from");
  const to = assertIsoDate(readArgument("--to") ?? today, "--to");
  if (from > to) throw new Error("--from no puede ser posterior a --to");

  const requested = (readArgument("--source") ?? [...SOURCE_KEYS].join(","))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const invalid = requested.filter((source) => !SOURCE_KEYS.has(source));
  if (invalid.length > 0) throw new Error(`Fuentes desconocidas: ${invalid.join(", ")}`);
  return { from, to, sources: new Set(requested) };
}

function parseOfficialDate(rawValue) {
  const value = String(rawValue ?? "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

async function fetchDiputadosVigentes() {
  const url = "https://opendata.congreso.cl/wscamaradiputados.asmx/getDiputados_Vigentes";
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Congreso WSDL HTTP ${response.status}`);
  const xml = await response.text();
  const memberPattern = /<Diputado>([\s\S]*?)<\/Diputado>/g;
  const members = [];
  let match;
  while ((match = memberPattern.exec(xml)) !== null) {
    const tag = (name) => match[1].match(new RegExp(`<${name}>(.*?)</${name}>`, "s"))?.[1]?.trim() ?? "";
    const district = match[1].match(/<Distrito>(\d+)<\/Distrito>/)?.[1] ?? "";
    members.push({
      id: tag("DIPID"),
      nombre: `${tag("Nombre")} ${tag("Apellido_Paterno")} ${tag("Apellido_Materno")}`.replace(/\s+/g, " ").trim(),
      distrito: district || null,
      cargo: "Diputado/a — Cámara de Diputadas y Diputados",
      url,
      fuente: "Congreso Nacional · opendata.congreso.cl (WSDL getDiputados_Vigentes)",
    });
  }
  return members.sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

async function mapConcurrent(values, concurrency, mapper) {
  const output = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return output;
}

async function fetchVoteDetail(base, vote) {
  const url = `${base}/retornarVotacionDetalle?prmVotacionId=${encodeURIComponent(vote.id)}`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Detalle de votación ${vote.id}: HTTP ${response.status}`);
  const xml = await response.text();
  const votePattern = /<Voto>([\s\S]*?)<\/Voto>/g;
  const individualVotes = [];
  let match;
  while ((match = votePattern.exec(xml)) !== null) {
    const member = match[1].match(/<Diputado>([\s\S]*?)<\/Diputado>/s)?.[1] ?? "";
    const memberTag = (name) => member.match(new RegExp(`<${name}>(.*?)</${name}>`, "s"))?.[1]?.trim() ?? "";
    const option = match[1].match(/<OpcionVoto Valor="(\d+)">(.*?)<\/OpcionVoto>/s);
    individualVotes.push({
      id: memberTag("Id"),
      nombre: `${memberTag("Nombre")} ${memberTag("ApellidoPaterno")} ${memberTag("ApellidoMaterno")}`.replace(/\s+/g, " ").trim(),
      opcion_valor: option?.[1] ?? "",
      opcion: option?.[2]?.trim() ?? null,
    });
  }
  return { ...vote, votos: individualVotes, url };
}

async function fetchVotacionesCamara({ from, to }) {
  const base = "https://opendata.camara.cl/camaradiputados/WServices/WSLegislativo.asmx";
  const votes = [];
  for (let year = Number(from.slice(0, 4)); year <= Number(to.slice(0, 4)); year += 1) {
    const listUrl = `${base}/retornarVotacionesXAnno?prmAnno=${year}`;
    const response = await fetch(listUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Listado de votaciones ${year}: HTTP ${response.status}`);
    const xml = await response.text();
    const votePattern = /<Votacion>([\s\S]*?)<\/Votacion>/g;
    let match;
    while ((match = votePattern.exec(xml)) !== null) {
      const tag = (name) => match[1].match(new RegExp(`<${name}>(.*?)</${name}>`, "s"))?.[1]?.trim() ?? "";
      const text = (name) => match[1].match(new RegExp(`<${name} Valor="\\d+">(.*?)</${name}>`, "s"))?.[1]?.trim() ?? "";
      const originalDate = tag("Fecha");
      const date = parseOfficialDate(originalDate);
      const desdePeriodo = PERIODO_ACTUAL_DESDE;
      if (!date || date < desdePeriodo || date > to) continue;
      votes.push({
        id: tag("Id"),
        descripcion: tag("Descripcion"),
        fecha: date,
        fecha_original: originalDate,
        total_si: tag("TotalSi"),
        total_no: tag("TotalNo"),
        total_abstencion: tag("TotalAbstencion"),
        total_dispensado: tag("TotalDispensado"),
        quorum: text("Quorum") || null,
        resultado: text("Resultado") || null,
        tipo: text("Tipo") || null,
      });
    }
  }

  const enriched = await mapConcurrent(votes, 8, async (vote) => {
    const boletinMatch = String(vote.descripcion ?? "").match(/Bolet[íi]n\s*N[º°]?\s*([0-9.\-]+)/i);
    if (!boletinMatch) return vote;
    const boletin = boletinMatch[1].replace(/\./g, "");
    try {
      const response = await fetch(
        `https://opendata.congreso.cl/wscamaradiputados.asmx/getVotaciones_Boletin?prmBoletin=${encodeURIComponent(boletin)}`,
        { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
      );
      if (!response.ok) return { ...vote, boletin };
      const xml = await response.text();
      const match = xml.match(/<Votacion>([\s\S]*?)<\/Votacion>/);
      if (!match) return { ...vote, boletin };
      const tag = (name) => match[1].match(new RegExp(`<${name}[^>]*>(.*?)</${name}>`, "s"))?.[1]?.trim() ?? "";
      const sesionMatch = match[1].match(/<Sesion>[\s\S]*?<ID>(\d+)<\/ID>/);
      return {
        ...vote,
        boletin,
        tramite: tag("Tramite") || null,
        informe: tag("Informe") || null,
        sesion_id: sesionMatch?.[1] ?? null,
        url_tramitacion: `https://tramitacion.senado.cl/appsenado/templates/tramitacion/index.php?boletin_ini=${boletin}`,
      };
    } catch {
      return { ...vote, boletin };
    }
  });

  votes.sort((a, b) => a.fecha.localeCompare(b.fecha) || String(a.id).localeCompare(String(b.id)));
  const detailed = await mapConcurrent(enriched, 8, (vote) => fetchVoteDetail(base, vote));
  return detailed.map((vote) => ({
    ...vote,
    id: `vot-${vote.id}`,
    votacion_id: vote.id,
    fuente: "Congreso Nacional · opendata.camara.cl (WSLegislativo, votaciones de sala)",
  }));
}

/**
 * Gastos operacionales de senadores/as publicados por el Senado (Transparencia
 * activa, web-back.senado.cl). Se descarga el año calendario completo del
 * último período publicado (todos los meses del año que ya fueron publicados),
 * para que la ficha muestre la serie mensual real. Cada registro conserva el
 * monto (CLP) y el concepto rendido por el ejecutor.
 */
async function fetchGastosSenado() {
  const latest = await discoverLatestSenateExpensePeriod();
  const months = [];
  for (let month = 1; month <= latest.month; month += 1) {
    months.push(await fetchSenateOperationalExpenses({ year: latest.year, month }));
  }
  const records = months.flatMap((result) => result.records);
  const ids = new Set(records.map((record) => record.id));
  if (ids.size !== records.length) {
    console.warn(`[etl] gastos_senado: ${records.length - ids.size} ids reutilizados entre meses por el API; se desambiguan con el período.`);
  }
  return records.map((record) => ({
    id: `${record.period}-${record.id}`,
    kind: "expense",
    nombre: record.person.name,
    person: record.person,
    subject_entity_ids: record.subject_entity_ids,
    object_entity_ids: record.object_entity_ids,
    fecha: record.fecha,
    periodo: record.period,
    item: record.title,
    monto_clp: record.monto_clp,
    url: record.url,
    fuente: record.fuente,
  }));
}

function hasSource(record) {
  if (!record || typeof record !== "object") return false;
  const source = record.fuente ?? record.url ?? record.link ?? record.origen;
  return typeof source === "string" && source.length > 8;
}

function validateRecords(name, records, minimumExpected = 1) {
  if (!Array.isArray(records)) throw new Error(`${name}: esquema inválido`);
  const traced = records.filter(hasSource);
  const discarded = records.length - traced.length;
  if (discarded > 0) console.warn(`[etl] ${name}: ${discarded}/${records.length} registros sin fuente descartados.`);
  if (traced.length < minimumExpected) {
    throw new Error(`${name}: ${traced.length} registros válidos; se esperaban al menos ${minimumExpected}.`);
  }
  return traced;
}

async function runSource({ key, label, selected, previous, snapshot, summary, summaryKey, load, minimum = 1, preserveHistory = false }) {
  if (!selected.has(key)) return;
  try {
    const records = validateRecords(label, await load(), minimum);
    summary[summaryKey] = records.length;
    const snapshotKey = key === "camara" ? "congreso_opendata" : key;
    snapshot.fuentes[snapshotKey] = preserveHistory
      ? mergeRecordsById(previous?.fuentes?.[snapshotKey] ?? [], records)
      : records;
  } catch (error) {
    summary.errores.push(`${label}: ${String(error)}`);
    const snapshotKey = key === "camara" ? "congreso_opendata" : key;
    snapshot.fuentes[snapshotKey] = previous?.fuentes?.[snapshotKey] ?? [];
  }
}

async function main() {
  const startedAt = Date.now();
  const now = new Date();
  const options = parseOptions();
  const previous = readJsonIfPresent(latestPath, null);
  const summary = {
    fecha_ejecucion: now.toISOString(),
    hora_chile: now.toLocaleString("es-CL", { timeZone: "America/Santiago" }),
    rango: { desde: options.from, hasta: options.to },
    fuentes_solicitadas: [...options.sources].sort(),
    duracion_ms: 0,
    declaraciones_ingresadas: 0,
    diputados_ingresados: 0,
    registros_lobby_ingresados: 0,
    votaciones_ingresadas: 0,
    votaciones_senado_ingresadas: 0,
    gastos_senado_ingresados: 0,
    gastos_camara_ingresados: 0,
    errores: [],
  };
  const snapshot = {
    generado_por: "scripts/etl.mjs",
    actualizado_en: now.toISOString(),
    fuentes: { ...(previous?.fuentes ?? {}) },
  };

  await runSource({
    key: "infoprobidad", label: "InfoProbidad", selected: options.sources, previous, snapshot, summary,
    summaryKey: "declaraciones_ingresadas", minimum: 0, preserveHistory: true,
    load: () => fetchInfoProbidad({ from: options.from, to: options.to, timeoutMs: REQUEST_TIMEOUT_MS }),
  });
  await runSource({
    key: "camara", label: "Congreso OpenData", selected: options.sources, previous, snapshot, summary,
    summaryKey: "diputados_ingresados", minimum: 100, load: fetchDiputadosVigentes,
  });
  await runSource({
    key: "infolobby", label: "InfoLobby", selected: options.sources, previous, snapshot, summary,
    summaryKey: "registros_lobby_ingresados", minimum: 0, preserveHistory: true,
    load: () => fetchInfoLobby({ from: options.from, to: options.to, timeoutMs: BULK_REQUEST_TIMEOUT_MS }),
  });
  await runSource({
    key: "votaciones_camara", label: "Votaciones Cámara", selected: options.sources, previous, snapshot, summary,
    summaryKey: "votaciones_ingresadas", minimum: 0, preserveHistory: true, load: () => fetchVotacionesCamara(options),
  });
  await runSource({
    key: "votaciones_senado", label: "Votaciones Senado", selected: options.sources, previous, snapshot, summary,
    summaryKey: "votaciones_senado_ingresadas", minimum: 0, preserveHistory: true,
    load: () => fetchVotacionesSenado({ legislatura: 374, desde: PERIODO_ACTUAL_DESDE, to: options.to }),
  });
  await runSource({
    key: "gastos_senado", label: "Gastos Operacionales Senado", selected: options.sources, previous, snapshot, summary,
    summaryKey: "gastos_senado_ingresados", minimum: 0, preserveHistory: true, load: fetchGastosSenado,
  });
  await runSource({
    key: "gastos_camara", label: "Gastos Operacionales Cámara", selected: options.sources, previous, snapshot, summary,
    summaryKey: "gastos_camara_ingresados", minimum: 0, preserveHistory: true,
    load: async () => {
      const { fetchGastosCamara } = await import("./etl/connectors/camara-gastos.mjs");
      return fetchGastosCamara({
        diputados: snapshot.fuentes?.congreso_opendata ?? previous?.fuentes?.congreso_opendata ?? [],
      });
    }
  });

  summary.duracion_ms = Date.now() - startedAt;
  console.log(`[etl] ${summary.hora_chile} — ${options.from}..${options.to} · declaraciones ${summary.declaraciones_ingresadas} · diputaciones ${summary.diputados_ingresados} · lobby ${summary.registros_lobby_ingresados} · votaciones ${summary.votaciones_ingresadas} · votaciones_senado ${summary.votaciones_senado_ingresadas} · gastos_senado ${summary.gastos_senado_ingresados} · gastos_camara ${summary.gastos_camara_ingresados} · errores ${summary.errores.length} (${summary.duracion_ms}ms)`);
  if (summary.errores.length > 0) console.warn(summary.errores.join("\n"));

  if (DRY_RUN) {
    assertSuccessfulRun(summary.errores);
    console.log("[etl] --dry-run: no se escribieron archivos.");
    return;
  }

  mkdirSync(dataDirectory, { recursive: true });
  writeFileAtomic(statusPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  assertSuccessfulRun(summary.errores);

  const dataOnly = (value) => JSON.stringify(value?.fuentes ?? {});
  const changed = !previous || dataOnly(previous) !== dataOnly(snapshot);
  if (!changed && previous?.actualizado_en) snapshot.actualizado_en = previous.actualizado_en;
  mergeLakeProjections(snapshot);
  writeFileAtomic(latestPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`[etl] snapshot ${changed ? "actualizado" : "sin cambios"} → ${latestPath}`);
}

main().catch((error) => {
  console.error("[etl] error fatal:", error);
  process.exit(1);
});
