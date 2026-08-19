import { createHash } from "node:crypto";
import { externalText } from "../safe-text.mjs";

const INDEX_URL = "https://datos.sinim.gov.cl/datos_municipales.php";
const EXPORT_URL = "https://datos.sinim.gov.cl/datos_municipales/obtener_datos_municipales.php";

export const SINIM_CORE_METRICS = [
  { id: 4210, area: 1, subarea: 517, code: "BPIIM", label: "Presupuesto Inicial Sector Municipal", unit: "miles de pesos", kind: "budget_execution" },
  { id: 4212, area: 1, subarea: 517, code: "BPVIM", label: "Presupuesto Vigente Sector Municipal", unit: "miles de pesos", kind: "budget_execution" },
  { id: 1110, area: 1, subarea: 21, code: "IADM01", label: "Ingresos Municipales (Ingreso Total Percibido)", unit: "miles de pesos", kind: "budget_execution" },
  { id: 1093, area: 1, subarea: 22, code: "IADM11", label: "Gastos Municipales (Gastos Total Devengado)", unit: "miles de pesos", kind: "expense" },
  { id: 3975, area: 1, subarea: 169, code: "IADM61", label: "Gastos en Personal Municipal (Subtítulo 21)", unit: "miles de pesos", kind: "expense" },
  { id: 1229, area: 1, subarea: 170, code: "IADM60", label: "Transferencias Corrientes", unit: "miles de pesos", kind: "transfer" },
  { id: 880, area: 1, subarea: 21, code: "IADM40", label: "Ingresos por Fondo Común Municipal", unit: "miles de pesos", kind: "transfer" },
  { id: 910, area: 1, subarea: 22, code: "IADM39", label: "Monto Transferido al Fondo Común Municipal", unit: "miles de pesos", kind: "transfer" },
  { id: 4071, area: 608, subarea: 384, code: "IRH17", label: "Número de Funcionarios Municipales (Planta y Contrata)", unit: "número entero", kind: "remuneration" },
];

function decodeXml(value) {
  return externalText(value);
}

function spreadsheetRows(xml) {
  const rows = [];
  for (const rowMatch of xml.matchAll(/<Row\b[^>]*>([\s\S]*?)<\/Row>/gi)) {
    const row = [];
    let column = 0;
    for (const cellMatch of rowMatch[1].matchAll(/<Cell\b([^>]*)>([\s\S]*?)<\/Cell>/gi)) {
      const explicitIndex = cellMatch[1].match(/(?:ss:)?Index=["'](\d+)["']/i);
      if (explicitIndex) column = Number(explicitIndex[1]) - 1;
      const data = cellMatch[2].match(/<Data\b[^>]*>([\s\S]*?)<\/Data>/i);
      row[column] = data ? decodeXml(data[1]) : "";
      column += 1;
    }
    rows.push(row);
  }
  return rows;
}

function parseValue(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized || /^(?:s\/?i|sin informaci[oó]n|no (?:recepcionado|informado|aplica)|n\/?a|-)$/i.test(normalized)) return null;
  const number = Number(normalized.replaceAll(" ", "").replace(",", "."));
  if (!Number.isFinite(number)) throw new Error(`SINIM_INVALID_VALUE: ${value}`);
  return number;
}

export function extractSinimPeriods(html) {
  const periods = [];
  const select = html.match(/<select\b[^>]*id=["']periodos["'][^>]*>([\s\S]*?)<\/select>/i)?.[1] ?? "";
  for (const match of select.matchAll(/<option\b[^>]*value=["'](\d+)["'][^>]*>[\s\S]*?(\d{4})[\s\S]*?<\/option>/gi)) {
    periods.push({ id: Number(match[1]), year: Number(match[2]) });
  }
  return periods;
}

export function buildSinimExportUrl(periodId, metrics = SINIM_CORE_METRICS) {
  if (!Number.isSafeInteger(periodId) || periodId < 1) throw new Error("SINIM_INVALID_PERIOD_ID");
  if (!Array.isArray(metrics) || metrics.length === 0) throw new Error("SINIM_EMPTY_METRICS");
  const params = new URLSearchParams();
  params.set("area[]", [...new Set(metrics.map((metric) => metric.area))].join(","));
  params.set("subarea[]", [...new Set(metrics.map((metric) => metric.subarea))].join(","));
  params.set("variables[]", metrics.map((metric) => metric.id).join(","));
  params.set("periodos[]", String(periodId));
  params.set("regiones[]", "T");
  params.set("municipios[]", "T");
  params.set("corrmon", "0");
  return `${EXPORT_URL}?${params}`;
}

export function normalizeSinimSpreadsheetXml(xml, { year, metrics = SINIM_CORE_METRICS, sourceUrl }) {
  const rows = spreadsheetRows(xml);
  const columnHeaderIndex = rows.findIndex((row) => row[0] === "CODIGO" && row[1] === "MUNICIPIO");
  if (columnHeaderIndex < 1) throw new Error("SINIM_INVALID_SPREADSHEET_SCHEMA");
  const labels = rows[columnHeaderIndex - 1].slice(2);
  const years = rows[columnHeaderIndex].slice(2);
  if (labels.length < metrics.length || years.length < metrics.length) throw new Error("SINIM_COLUMN_COUNT_MISMATCH");
  const metricColumns = metrics.map((metric) => labels.findIndex((label, index) => label?.split(/\s+/)[0] === metric.code && Number(years[index]) === year));
  metrics.forEach((metric, index) => {
    if (metricColumns[index] < 0) throw new Error(`SINIM_METRIC_HEADER_MISMATCH: expected=${metric.code}/${year}`);
  });
  const records = [];
  let missingValueCount = 0;
  const municipalityCodes = new Set();
  for (const row of rows.slice(columnHeaderIndex + 1)) {
    const municipalityCode = String(row[0] ?? "").trim();
    const municipalityName = String(row[1] ?? "").trim();
    if (!/^\d{5}$/.test(municipalityCode) || !municipalityName) continue;
    municipalityCodes.add(municipalityCode);
    metrics.forEach((metric, index) => {
      const originalValue = row[metricColumns[index] + 2] ?? "";
      const value = parseValue(originalValue);
      if (value === null) missingValueCount += 1;
      const isMoney = metric.unit === "miles de pesos";
      const amountClp = isMoney && value !== null ? value * 1000 : null;
      if (amountClp !== null && !Number.isSafeInteger(amountClp)) throw new Error(`SINIM_UNSAFE_CLP_AMOUNT: ${originalValue}`);
      records.push({
        id: `sinim-${year}-${municipalityCode}-${metric.code}`,
        fecha: `${year}-12-31`,
        period: String(year),
        kind: metric.kind,
        title: metric.label,
        description: `${metric.label} informado por SINIM para ${municipalityName}.`,
        municipality_code: municipalityCode,
        municipality_name: municipalityName,
        metric_id: metric.id,
        metric_code: metric.code,
        metric_label: metric.label,
        value,
        availability: value === null ? "not_received" : "published",
        original_value: String(originalValue),
        original_unit: metric.unit,
        monto_clp: amountClp,
        monto_original: isMoney && value !== null ? { amount: String(originalValue), currency: "CLP", unit: "miles de pesos" } : null,
        subject_entity_ids: [`municipality-cl-${municipalityCode}`],
        url: sourceUrl,
        fuente: "SINIM · SUBDERE",
        attribution: "Sistema Nacional de Información Municipal (SINIM), SUBDERE, Ministerio del Interior",
        commercial_use: "prohibited",
      });
    });
  }
  if (municipalityCodes.size !== 345) {
    // Los fixtures contractuales pueden contener una muestra; la ingesta real
    // valida por separado la cobertura nacional esperada.
  }
  return { records, municipalityCount: municipalityCodes.size, missingValueCount };
}

export async function fetchSinimAnnual({ year, metrics = SINIM_CORE_METRICS, fetchImpl = fetch, timeoutMs = 120_000 }) {
  const headers = { "User-Agent": "TransparenciaChile-ETL/3.0" };
  const indexResponse = await fetchImpl(INDEX_URL, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!indexResponse.ok) throw new Error(`SINIM_INDEX_HTTP_${indexResponse.status}`);
  const periods = extractSinimPeriods(await indexResponse.text());
  const period = periods.find((candidate) => candidate.year === year);
  if (!period) throw new Error(`SINIM_PERIOD_NOT_PUBLISHED: ${year}`);
  const sourceUrl = buildSinimExportUrl(period.id, metrics);
  const response = await fetchImpl(sourceUrl, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`SINIM_EXPORT_HTTP_${response.status}`);
  const original = Buffer.from(await response.arrayBuffer());
  const xml = new TextDecoder("utf-8").decode(original);
  const normalized = normalizeSinimSpreadsheetXml(xml, { year, metrics, sourceUrl });
  if (normalized.municipalityCount !== 345) throw new Error(`SINIM_MUNICIPALITY_COVERAGE: expected=345 actual=${normalized.municipalityCount}`);
  return {
    sourceId: "sinim",
    year,
    period: String(year),
    ...normalized,
    original: {
      name: `sinim-${year}-datos-municipales.xml.xls`,
      url: sourceUrl,
      data: original,
      checksumSha256: createHash("sha256").update(original).digest("hex"),
      license: "Atribución obligatoria; uso comercial excluido",
      redistributable: true,
    },
  };
}
