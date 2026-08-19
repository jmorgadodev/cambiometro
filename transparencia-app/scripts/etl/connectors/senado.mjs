import { createHash } from "node:crypto";
import { stableStringify } from "../core.mjs";

const API_BASE = "https://web-back.senado.cl";
const EXPENSE_PATH = "/api/transparency/expenses/senator-Operational-expenses";
const PERIODS_PATH = "/api/transparency/available-periods";
const PERIOD_ENDPOINT = "gastos-operacionales-senadores";
const DATASETS = {
  operational_expenses: { path: EXPENSE_PATH, periodEndpoint: PERIOD_ENDPOINT, pageSize: 500, pageUrl: "https://www.senado.cl/transparencia/gastos-operacionales-senadores" },
  diet: { path: "/api/transparency/diet", periodEndpoint: "dietas", pageSize: 300, pageUrl: "https://www.senado.cl/transparencia/dietas" },
  domestic_tickets: { path: "/api/transparency/domestic-air-tickets", periodEndpoint: "pasajes-aereos-nacionales", pageSize: 500, pageUrl: "https://www.senado.cl/transparencia/viajes-nacionales" },
  foreign_missions: { path: "/api/transparency/foreign-missions", periodEndpoint: "misiones-al-extranjero", pageSize: 500, pageUrl: "https://www.senado.cl/transparencia/misiones-al-extranjero" },
};

function validPeriod(year, month) {
  if (!Number.isInteger(year) || year < 1990 || year > 2100) throw new Error("SENADO_INVALID_YEAR");
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error("SENADO_INVALID_MONTH");
}

export function buildSenateExpenseUrl(year, month, page = 1) {
  validPeriod(year, month);
  if (!Number.isInteger(page) || page < 1) throw new Error("SENADO_INVALID_PAGE");
  const url = new URL(EXPENSE_PATH, API_BASE);
  url.searchParams.set("sort", "gastos_operacionales");
  url.searchParams.set("filters[ano][$eq]", String(year));
  url.searchParams.set("filters[mes][$eq]", String(month));
  url.searchParams.set("pagination[pageSize]", "500");
  url.searchParams.set("pagination[page]", String(page));
  return url.toString();
}

function buildDatasetUrl(dataset, year, month, page = 1) {
  validPeriod(year, month);
  const config = DATASETS[dataset];
  if (!config) throw new Error(`SENADO_UNKNOWN_DATASET: ${dataset}`);
  const url = new URL(config.path, API_BASE);
  url.searchParams.set("filters[ano][$eq]", String(year));
  url.searchParams.set("filters[mes][$eq]", String(month));
  url.searchParams.set("pagination[pageSize]", String(config.pageSize));
  url.searchParams.set("pagination[page]", String(page));
  return url.toString();
}

function normalizeAmount(value) {
  if (value === null || value === undefined) return null;
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`SENADO_INVALID_AMOUNT: ${value}`);
  return value;
}

export function normalizeSenateExpense(item, { sourceUrl }) {
  const attributes = item?.attributes;
  if (!Number.isInteger(item?.id) || !attributes?.gastos_operacionales || !Number.isInteger(attributes.unidad_ejecutora)) throw new Error("SENADO_INVALID_SCHEMA");
  validPeriod(attributes.ano, attributes.mes);
  const amount = normalizeAmount(attributes.monto);
  const fullName = [attributes.nombre, attributes.appaterno, attributes.apmaterno].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (!fullName) throw new Error("SENADO_INVALID_NAME");
  const personEntityId = `senator-cl-ue-${attributes.unidad_ejecutora}`;
  const period = `${attributes.ano}-${String(attributes.mes).padStart(2, "0")}`;
  return {
    id: `senado-operational-expense-${item.id}`,
    fecha: `${period}-01`,
    period,
    kind: "expense",
    title: attributes.gastos_operacionales.trim(),
    description: `Gasto operacional informado por el Senado para ${period}. No constituye remuneración ni implica irregularidad.`,
    category: attributes.gastos_operacionales.trim(),
    person: {
      entity_id: personEntityId,
      official_id: String(attributes.unidad_ejecutora),
      name: fullName,
      role: "Senador/a",
    },
    subject_entity_ids: [personEntityId],
    object_entity_ids: [],
    monto_clp: amount,
    monto_original: amount === null ? null : { amount: String(amount), currency: "CLP", unit: "pesos" },
    availability: amount === null ? "not_reported" : "reported",
    published_at: attributes.publishedAt ?? null,
    url: sourceUrl,
    fuente: "Senado de la República · Transparencia activa",
    license: "Información pública oficial; redistribución de originales no presumida",
    reconciliation_method: "official_senate_executor_id",
  };
}

function personFromAttributes(attributes) {
  const name = [attributes.nombre, attributes.appaterno, attributes.apmaterno].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (!name || !Number.isInteger(attributes.unidad_ejecutora)) throw new Error("SENADO_INVALID_PERSON");
  return { entity_id: `senator-cl-ue-${attributes.unidad_ejecutora}`, official_id: String(attributes.unidad_ejecutora), name, role: "Senador/a" };
}

export function normalizeSenateDiet(item, { sourceUrl }) {
  const attributes = item?.attributes;
  if (!Number.isInteger(item?.id)) throw new Error("SENADO_INVALID_SCHEMA");
  validPeriod(attributes?.ano, attributes?.mes);
  const person = personFromAttributes(attributes);
  const gross = normalizeAmount(attributes.dieta);
  const deductions = normalizeAmount(attributes.deducciones);
  const net = normalizeAmount(attributes.saldo);
  if (gross === null || deductions === null || net === null || gross - deductions !== net) throw new Error("SENADO_INVALID_DIET_TOTALS");
  const period = `${attributes.ano}-${String(attributes.mes).padStart(2, "0")}`;
  return {
    id: `senado-diet-${item.id}`, fecha: `${period}-01`, period, kind: "remuneration",
    title: "Dieta parlamentaria", description: `Dieta, deducciones y saldo informados por el Senado para ${period}.`,
    person, subject_entity_ids: [person.entity_id], object_entity_ids: [],
    monto_clp: gross, deductions_clp: deductions, net_clp: net,
    monto_original: { amount: String(gross), currency: "CLP", unit: "pesos" },
    published_at: attributes.publishedAt ?? null, url: sourceUrl,
    fuente: "Senado de la República · Transparencia activa", license: "Información pública oficial; redistribución de originales no presumida",
    reconciliation_method: "official_senate_executor_id",
  };
}

export function normalizeSenateDomesticTicket(item, { sourceUrl }) {
  const attributes = item?.attributes;
  if (!Number.isInteger(item?.id) || !/^\d{4}-\d{2}-\d{2}$/.test(attributes?.fecha ?? "")) throw new Error("SENADO_INVALID_TICKET_SCHEMA");
  validPeriod(attributes.ano, attributes.mes);
  const person = personFromAttributes(attributes);
  return {
    id: `senado-domestic-ticket-${item.id}`, fecha: attributes.fecha, period: `${attributes.ano}-${String(attributes.mes).padStart(2, "0")}`, kind: "expense",
    title: "Pasaje aéreo nacional", description: attributes.origendestino ? `Ruta informada: ${attributes.origendestino}.` : null,
    route: attributes.origendestino ?? null, status: attributes.estado ?? null,
    person, subject_entity_ids: [person.entity_id], object_entity_ids: [], monto_clp: null, monto_original: null,
    published_at: attributes.publishedAt ?? null, url: sourceUrl,
    fuente: "Senado de la República · Transparencia activa", license: "Información pública oficial; redistribución de originales no presumida",
    reconciliation_method: "official_senate_executor_id",
  };
}

export function normalizeSenateForeignMission(item, { sourceUrl }) {
  const attributes = item?.attributes;
  if (!Number.isInteger(item?.id) || !/^\d{4}-\d{2}-\d{2}$/.test(attributes?.fecha_ida ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(attributes?.fecha_regreso ?? "")) throw new Error("SENADO_INVALID_MISSION_SCHEMA");
  validPeriod(attributes.ano, attributes.mes);
  const amount = /^\d+$/.test(String(attributes.monto ?? "")) ? Number(attributes.monto) : Number.NaN;
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("SENADO_INVALID_MISSION_AMOUNT");
  const displayName = [attributes.nombre, attributes.appaterno, attributes.apmaterno].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  return {
    id: `senado-foreign-mission-${item.id}`, fecha: attributes.fecha_ida, period: `${attributes.ano}-${String(attributes.mes).padStart(2, "0")}`, kind: "expense",
    title: attributes.objeto || "Misión al extranjero", description: attributes.destino ? `Destino informado: ${attributes.destino}.` : null,
    person_display_name: displayName, destination: attributes.destino ?? null, from_date: attributes.fecha_ida, to_date: attributes.fecha_regreso,
    subject_entity_ids: [], object_entity_ids: [], monto_clp: amount,
    monto_original: { amount: String(attributes.monto), currency: "CLP", unit: "pesos" },
    published_at: attributes.publishedAt ?? null, url: sourceUrl,
    fuente: "Senado de la República · Transparencia activa", license: "Información pública oficial; redistribución de originales no presumida",
    reconciliation_method: "unlinked_no_official_identifier",
  };
}

async function fetchJson(url, fetchImpl, timeoutMs) {
  const response = await fetchImpl(url, { headers: { Accept: "application/json", "User-Agent": "TransparenciaChile-ETL/3.0" }, signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`SENADO_HTTP_${response.status}`);
  return response.json();
}

export async function discoverLatestSenateExpensePeriod({ fetchImpl = fetch, timeoutMs = 60_000 } = {}) {
  return discoverLatestSenatePeriod({ dataset: "operational_expenses", fetchImpl, timeoutMs });
}

export async function discoverLatestSenatePeriod({ dataset, fetchImpl = fetch, timeoutMs = 60_000 }) {
  const config = DATASETS[dataset];
  if (!config) throw new Error(`SENADO_UNKNOWN_DATASET: ${dataset}`);
  const url = new URL(PERIODS_PATH, API_BASE);
  url.searchParams.set("pagination[limit]", "500");
  url.searchParams.set("filters[endpoint][$eq]", config.periodEndpoint);
  const payload = await fetchJson(url, fetchImpl, timeoutMs);
  const periods = (payload?.data?.data ?? []).map((item) => ({ year: item.attributes?.ano, month: item.attributes?.mes })).filter(({ year, month }) => Number.isInteger(year) && Number.isInteger(month));
  periods.sort((a, b) => b.year - a.year || b.month - a.month);
  if (!periods.length) throw new Error("SENADO_NO_PUBLISHED_PERIODS");
  return periods[0];
}

async function fetchSenateDataset({ dataset, year, month, normalize, fetchImpl = fetch, timeoutMs = 60_000 }) {
  const config = DATASETS[dataset];
  if (!config) throw new Error(`SENADO_UNKNOWN_DATASET: ${dataset}`);
  const pages = [];
  let page = 1;
  let pageCount = 1;
  do {
    const sourceUrl = buildDatasetUrl(dataset, year, month, page);
    const payload = await fetchJson(sourceUrl, fetchImpl, timeoutMs);
    const pagination = payload?.data?.meta?.pagination;
    const items = payload?.data?.data;
    if (!Array.isArray(items) || !Number.isInteger(pagination?.pageCount)) throw new Error("SENADO_INVALID_RESPONSE_SCHEMA");
    pages.push({ sourceUrl, payload });
    pageCount = pagination.pageCount;
    page += 1;
  } while (page <= pageCount);
  const records = pages.flatMap(({ sourceUrl, payload }) => payload.data.data.map((item) => normalize(item, { sourceUrl })));
  if (!records.length) throw new Error(`SENADO_PERIOD_NOT_PUBLISHED: ${dataset}:${year}-${String(month).padStart(2, "0")}`);
  const originalText = `${pages.map(({ payload }) => stableStringify(payload)).join("\n")}\n`;
  return {
    sourceId: "senado", dataset, year, month, period: `${year}-${String(month).padStart(2, "0")}`, records,
    original: { name: `senado-${year}-${String(month).padStart(2, "0")}-${dataset}-api.jsonl`, url: config.pageUrl, checksumSha256: createHash("sha256").update(originalText).digest("hex"), size: Buffer.byteLength(originalText), license: "Información pública oficial; redistribución de originales no presumida", redistributable: false },
  };
}

export const fetchSenateDiet = (options) => fetchSenateDataset({ ...options, dataset: "diet", normalize: normalizeSenateDiet });
export const fetchSenateDomesticTickets = (options) => fetchSenateDataset({ ...options, dataset: "domestic_tickets", normalize: normalizeSenateDomesticTicket });
export const fetchSenateForeignMissions = (options) => fetchSenateDataset({ ...options, dataset: "foreign_missions", normalize: normalizeSenateForeignMission });

export async function fetchSenateOperationalExpenses({ year, month, fetchImpl = fetch, timeoutMs = 60_000 }) {
  validPeriod(year, month);
  const pages = [];
  let page = 1;
  let pageCount = 1;
  do {
    const sourceUrl = buildSenateExpenseUrl(year, month, page);
    const payload = await fetchJson(sourceUrl, fetchImpl, timeoutMs);
    const pagination = payload?.data?.meta?.pagination;
    const items = payload?.data?.data;
    if (!Array.isArray(items) || !Number.isInteger(pagination?.pageCount)) throw new Error("SENADO_INVALID_RESPONSE_SCHEMA");
    pages.push({ sourceUrl, payload });
    pageCount = pagination.pageCount;
    page += 1;
  } while (page <= pageCount);
  const records = pages.flatMap(({ sourceUrl, payload }) => payload.data.data.map((item) => normalizeSenateExpense(item, { sourceUrl })));
  if (records.length === 0) throw new Error(`SENADO_PERIOD_NOT_PUBLISHED: ${year}-${String(month).padStart(2, "0")}`);
  const seen = new Set();
  const unique = records.filter((record) => (seen.has(record.id) ? false : (seen.add(record.id), true)));
  if (unique.length !== records.length) {
    console.warn(`[senado] ${year}-${String(month).padStart(2, "0")}: ${records.length - unique.length} registros duplicados entre páginas (sort inestable del API) descartados.`);
  }
  const originalText = `${pages.map(({ payload }) => stableStringify(payload)).join("\n")}\n`;
  return {
    sourceId: "senado",
    year,
    month,
    period: `${year}-${String(month).padStart(2, "0")}`,
    records: unique,
    original: {
      name: `senado-${year}-${String(month).padStart(2, "0")}-gastos-operacionales-api.jsonl`,
      url: "https://www.senado.cl/transparencia/gastos-operacionales-senadores",
      checksumSha256: createHash("sha256").update(originalText).digest("hex"),
      size: Buffer.byteLength(originalText),
      license: "Información pública oficial; redistribución de originales no presumida",
      redistributable: false,
    },
  };
}
