import crypto from "node:crypto";
import { externalText } from "./safe-text.mjs";
import { assertReleaseCandidate } from "./release-candidate.mjs";

export const SOURCE_URL = "https://comision38bis.gob.cl/registro-publico";
export const SOURCE_CSV_URL = `${SOURCE_URL}?csv-todo`;

export function extractPeriod(html) {
  const titlePeriod = String(html).match(/Registro\s+de\s+remuneraciones\s+(\d{4}-\d{2})/i)?.[1];
  if (titlePeriod) return titlePeriod;
  return String(html).match(/<option[^>]*value=["'](\d{4}-\d{2})["'][^>]*>/i)?.[1] ?? null;
}

function parseAmount(value) {
  const text = externalText(value);
  if (!text || /no\s+(?:aplica|informado|publicado)/i.test(text)) return null;
  const match = text.match(/\d[\d.]*/);
  if (!match) return null;
  const amount = Number.parseInt(match[0].replaceAll(".", ""), 10);
  return Number.isFinite(amount) ? amount : null;
}

function amountSourceDetails(value) {
  const original = externalText(value).trim();
  if (parseAmount(original) !== null) return { bruto_mensual_texto_fuente: original, bruto_mensual_estado_fuente: "informado" };
  if (/^no\s+aplica\b/i.test(original)) return { bruto_mensual_texto_fuente: original, bruto_mensual_estado_fuente: "no_aplica" };
  if (/^no\s+(?:reportado|informado|publicado)\b/i.test(original)) return { bruto_mensual_texto_fuente: original, bruto_mensual_estado_fuente: "no_reportado" };
  return { bruto_mensual_texto_fuente: original, bruto_mensual_estado_fuente: original ? "no_interpretable" : "sin_celda" };
}

export function parseRows(html) {
  const rows = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellPattern = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;

  for (const rowMatch of String(html).matchAll(rowPattern)) {
    const cells = [...rowMatch[1].matchAll(cellPattern)].map((cell) => cell[1]);
    if (cells.length < 4) continue;
    const hasAmountCell = cells.length >= 5;
    const amountSource = amountSourceDetails(hasAmountCell ? cells[4] : "");
    rows.push({
      partida: externalText(cells[0]),
      organismo: externalText(cells[1]),
      cargo: externalText(cells[2]),
      nombre: externalText(cells[3]),
      bruto_mensual: hasAmountCell ? parseAmount(cells[4]) : null,
      ...amountSource,
    });
  }

  return rows;
}

function normalizeHeader(value) {
  return externalText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function parseDelimited(text, separator = ";") {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const input = String(text).replace(/^\uFEFF/, "");
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];
    if (character === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === separator && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    if (row.some((value) => value.trim())) rows.push(row);
  }
  return rows;
}

function columnIndex(headers, ...names) {
  for (const name of names) {
    const index = headers.indexOf(normalizeHeader(name));
    if (index >= 0) return index;
  }
  return -1;
}

export function parseCsvRows(csv) {
  const table = parseDelimited(csv);
  if (table.length < 2) return [];
  const headers = table[0].map(normalizeHeader);
  const periodIndex = columnIndex(headers, "PERÍODO", "PERIODO");
  const partidaIndex = columnIndex(headers, "PARTIDA PRESUP");
  const organizationIndex = columnIndex(headers, "ORGANISMO");
  const roleIndex = columnIndex(headers, "CARGO O PERFIL", "CARGO");
  const firstNameIndex = columnIndex(headers, "NOMBRES", "NOMBRE");
  const surnameIndex = columnIndex(headers, "APELLIDOS", "APELLIDO");
  const salaryIndex = columnIndex(headers, "REMUNERACIÓN BRUTA DEL MES", "REMUNERACION BRUTA DEL MES", "REMUNERACIÓN BRUTA", "REMUNERACION BRUTA");
  const fallbackAmountIndex = columnIndex(headers, "MONTO BRUTO", "TOTAL");
  if ([periodIndex, partidaIndex, organizationIndex, roleIndex, firstNameIndex].some((index) => index < 0)) return [];

  return table.slice(1).map((values) => {
    const firstName = externalText(values[firstNameIndex]);
    const surname = surnameIndex >= 0 ? externalText(values[surnameIndex]) : "";
    const name = [firstName, surname].filter(Boolean).join(" ") || "NO REPORTADO";
    const amountValue = salaryIndex >= 0 ? values[salaryIndex] : fallbackAmountIndex >= 0 ? values[fallbackAmountIndex] : "";
    const amountSource = amountSourceDetails(amountValue);
    return {
      periodo: externalText(values[periodIndex]),
      partida: externalText(values[partidaIndex]),
      organismo: externalText(values[organizationIndex]),
      cargo: externalText(values[roleIndex]),
      nombre: name,
      bruto_mensual: parseAmount(amountValue),
      ...amountSource,
    };
  }).filter((row) => /^\d{4}-\d{2}$/.test(row.periodo) && (row.partida || row.organismo || row.cargo));
}

export function latestCsvPeriod(csvRows) {
  return [...new Set(csvRows.map((row) => row.periodo).filter(Boolean))].sort().at(-1) ?? null;
}

export function checksumRows(rows) {
  return crypto.createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

export function validate38BisSnapshot(current, { previous } = {}) {
  if (previous) validate38BisSnapshot(previous);
  if (current?.url !== SOURCE_URL) throw new Error("38BIS_SOURCE_INVALID");
  if (!current || !/^\d{4}-(0[1-9]|1[0-2])$/.test(current.mes ?? "")) throw new Error("38BIS_PERIOD_INVALID");
  if (previous && current.mes < previous.mes) throw new Error("38BIS_PERIOD_REGRESSION");
  if (!Array.isArray(current.registros) || current.registros.length < 500) throw new Error("38BIS_COUNT_INCOMPLETE");
  if (current.registros.some((row) => row.bruto_mensual !== null && (!Number.isSafeInteger(row.bruto_mensual) || row.bruto_mensual < 0))) throw new Error("38BIS_AMOUNT_INVALID");
  const hasSourceAmountMetadata = current.registros.every((row) =>
    typeof row.bruto_mensual_estado_fuente === "string"
    && typeof row.bruto_mensual_texto_fuente === "string");
  const samePeriodCorrectionDropRatio = hasSourceAmountMetadata ? 0.005 : 0;
  const candidate = assertReleaseCandidate({ sourceId: "remuneraciones-38bis", expectedSourceId: "remuneraciones-38bis",
    periods: [current.mes], records: current.registros.map((row) => ({ id: checksumRows([row]) })), recordCount: current.filas,
    checksumSha256: current.checksum_sha256, actualChecksumSha256: checksumRows(current.registros), complete: true,
    previous: previous ? { recordCount: previous.filas, checksumSha256: previous.checksum_sha256 } : undefined,
    // Same-period corrections are narrowly allowed only after extraction preserves source amount labels.
    maxDropRatio: previous?.mes === current.mes ? samePeriodCorrectionDropRatio : 0.1 });
  return { ...candidate, status: previous?.mes !== current.mes ? "valid_candidate" : candidate.status };
}

export function validate38BisHistory(history) {
  if (history?.schema_version !== 1 || history.source_id !== "remuneraciones-38bis" || !Array.isArray(history.periodos)) throw new Error("38BIS_HISTORY_INVALID");
  const periods = new Set();
  for (const period of history.periodos) {
    if (periods.has(period.mes)) throw new Error("38BIS_HISTORY_DUPLICATE_PERIOD");
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period.mes ?? "")) throw new Error("38BIS_HISTORY_PERIOD_INVALID");
    if (!Array.isArray(period.registros) || period.filas !== period.registros.length || !period.filas) throw new Error("38BIS_HISTORY_COUNT_INVALID");
    if (period.checksum_sha256 !== checksumRows(period.registros)) throw new Error("38BIS_HISTORY_CHECKSUM_INVALID");
    // A published historical row has no official person ID. Keep repeated source rows
    // byte-for-byte; an apparent duplicate is not authority to delete or merge it.
    periods.add(period.mes);
  }
  return history;
}

function rowKey(row) {
  return [row.partida, row.organismo, row.cargo, row.nombre]
    .map((value) => externalText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").toLocaleUpperCase("es-CL"))
    .join("|");
}

export function compareRows(previousRows, currentRows, previousPeriod = null) {
  if (!Array.isArray(previousRows)) {
    return { estado: "linea_base", periodoAnterior: null, entradas: 0, salidasObservadas: 0, cambios: 0 };
  }
  const previousByKey = new Map(previousRows.map((row) => [rowKey(row), row]));
  const currentByKey = new Map(currentRows.map((row) => [rowKey(row), row]));
  let entradas = 0;
  let cambios = 0;
  for (const row of currentRows) {
    const previous = previousByKey.get(rowKey(row));
    if (!previous) entradas += 1;
    else if (previous.bruto_mensual !== row.bruto_mensual
      || (previous.bruto_mensual_estado_fuente !== undefined
        && (previous.bruto_mensual_estado_fuente !== row.bruto_mensual_estado_fuente
          || previous.bruto_mensual_texto_fuente !== row.bruto_mensual_texto_fuente))) cambios += 1;
  }
  let salidasObservadas = 0;
  for (const row of previousRows) if (!currentByKey.has(rowKey(row))) salidasObservadas += 1;
  return { estado: "comparado", periodoAnterior: previousPeriod, entradas, salidasObservadas, cambios };
}

export function buildHistory(previous, previousHistory, current) {
  const periods = Array.isArray(previousHistory?.periodos) ? [...previousHistory.periodos] : [];
  const known = new Set(periods.map((period) => period.mes));
  if (previous?.mes && Array.isArray(previous.registros) && !known.has(previous.mes)) {
    periods.push({ mes: previous.mes, filas: previous.registros.length, checksum_sha256: previous.checksum_sha256 ?? checksumRows(previous.registros), registros: previous.registros });
  }
  return {
    schema_version: 1,
    source_id: "remuneraciones-38bis",
    source_url: SOURCE_URL,
    extraido_en: current.extraido_en,
    periodos: periods.filter((period) => period.mes !== current.mes).sort((left, right) => right.mes.localeCompare(left.mes)),
  };
}
