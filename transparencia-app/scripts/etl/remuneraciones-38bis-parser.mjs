import crypto from "node:crypto";
import { externalText } from "./safe-text.mjs";

export const SOURCE_URL = "https://comision38bis.gob.cl/registro-publico";

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

export function parseRows(html) {
  const rows = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellPattern = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;

  for (const rowMatch of String(html).matchAll(rowPattern)) {
    const cells = [...rowMatch[1].matchAll(cellPattern)].map((cell) => cell[1]);
    if (cells.length < 4) continue;
    const hasAmountCell = cells.length >= 5;
    rows.push({
      partida: externalText(cells[0]),
      organismo: externalText(cells[1]),
      cargo: externalText(cells[2]),
      nombre: externalText(cells[3]),
      bruto_mensual: hasAmountCell ? parseAmount(cells[4]) : null,
    });
  }

  return rows;
}

export function checksumRows(rows) {
  return crypto.createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

function rowKey(row) {
  return [row.partida, row.organismo, row.cargo, row.nombre].join("|");
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
    else if (previous.bruto_mensual !== row.bruto_mensual) cambios += 1;
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
