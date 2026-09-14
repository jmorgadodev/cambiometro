/**
 * Contrato común para dominios que no son nóminas.
 *
 * La función devuelve una vista normalizada junto con la fila original. No
 * fusiona personas, no convierte ausencias en cero y no reemplaza releases.
 * La integración con los publicadores queda deliberadamente separada para
 * poder validar cada dominio antes de promoverlo.
 */

const CATEGORY_BY_SOURCE_KEY = Object.freeze({
  congreso_opendata: "nomina",
  personal_apoyo: "personal_apoyo",
  "personal-apoyo": "personal_apoyo",
  votaciones_camara: "votaciones",
  votaciones_senado: "votaciones",
  asistencia_camara: "asistencia",
  gastos_camara: "gastos",
  gastos_senado: "gastos",
});

const CATEGORY_BY_KIND = Object.freeze({
  vote: "votaciones",
  attendance: "asistencia",
  expense: "gastos",
  remuneration: "remuneraciones",
});

function text(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function dateOrNull(value) {
  const normalized = text(value);
  if (!normalized) return null;
  return /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(normalized) ? normalized.slice(0, 10) : null;
}

function periodOrNull(raw) {
  const period = text(raw?.period ?? raw?.periodo);
  if (period && /^\d{4}(?:-\d{2})?$/.test(period)) return period;
  const date = text(raw?.fecha ?? raw?.date ?? raw?.occurredAt);
  if (date && /^\d{4}-\d{2}/.test(date)) return date.slice(0, 7);
  const year = Number(raw?.ano ?? raw?.year);
  const month = Number(raw?.mes ?? raw?.month);
  if (Number.isInteger(year) && year >= 1900 && year <= 2200) {
    return Number.isInteger(month) && month >= 1 && month <= 12
      ? `${year}-${String(month).padStart(2, "0")}`
      : String(year);
  }
  return null;
}

function amountFrom(raw) {
  const fields = ["monto_clp", "monto_bruto", "monto", "amount"];
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(raw ?? {}, field)) continue;
    const value = raw[field];
    if (value === null || value === undefined || value === "") return { value: null, field, state: "not_reported" };
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return { value, field, state: "reported" };
    }
    return { value: null, field, state: "invalid" };
  }
  return { value: null, field: null, state: "not_available" };
}

function categoryFor(sourceKey, raw) {
  return CATEGORY_BY_SOURCE_KEY[sourceKey] ?? CATEGORY_BY_KIND[raw?.kind] ?? "no_determinada";
}

export function normalizeParliamentaryRecord({ sourceId, sourceKey, raw }) {
  const original = raw && typeof raw === "object" ? raw : {};
  const recordId = text(original.id ?? original.record_id ?? original.recordId);
  const amount = amountFrom(original);
  const qualityIssues = [];
  if (!recordId) qualityIssues.push("missing_stable_record_id");
  if (categoryFor(sourceKey, original) === "no_determinada") qualityIssues.push("category_not_determined");
  if (amount.state === "invalid") qualityIssues.push("invalid_amount");

  return {
    sourceId: text(sourceId),
    sourceKey: text(sourceKey),
    recordId,
    category: categoryFor(sourceKey, original),
    period: periodOrNull(original),
    occurredAt: dateOrNull(original.fecha ?? original.date ?? original.occurredAt),
    amountClp: amount.value,
    amountField: amount.field,
    amountState: amount.state,
    qualityIssues,
    original,
  };
}

function sourceDescriptors(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((source) => source && typeof source === "object").map((source) => ({
    level: text(source.nivel ?? source.level),
    medium: text(source.medio ?? source.medium),
    url: text(source.url),
    date: dateOrNull(source.fecha ?? source.date),
  }));
}

export function normalizeMovementRecord(raw) {
  const original = raw && typeof raw === "object" ? raw : {};
  const recordId = text(original.id ?? original.record_id ?? original.recordId);
  const entrantName = text(original.entrante ?? original.entro?.nombre);
  const outgoingName = text(original.saliente ?? original.salio?.nombre);
  const qualityIssues = [];
  if (!recordId) qualityIssues.push("missing_stable_record_id");
  if (!dateOrNull(original.fecha ?? original.eventDate)) qualityIssues.push("missing_event_date");
  if (sourceDescriptors(original.fuentes ?? original.sources).length === 0) qualityIssues.push("missing_documentary_source");

  return {
    sourceId: "movimientos",
    recordId,
    eventDate: dateOrNull(original.fecha ?? original.eventDate),
    detectedAt: text(original.fecha_deteccion ?? original.detected_at ?? original.detectedAt),
    role: text(original.cargo ?? original.role),
    organization: text(original.organismo ?? original.entidad ?? original.organization),
    entrantName,
    outgoingName,
    verificationState: text(original.estado ?? original.status) ?? "en_confirmacion",
    documentarySources: sourceDescriptors(original.fuentes ?? original.sources),
    qualityIssues,
    original,
  };
}

export function normalizeDomainRecord({ domain, raw, sourceId, sourceKey }) {
  if (domain === "movimientos") return normalizeMovementRecord(raw);
  return normalizeParliamentaryRecord({ sourceId, sourceKey, raw });
}

/**
 * Normaliza un lote sin reemplazarlo ni serializarlo. El resultado está
 * pensado para auditoría del ETL: `records` conserva cada fila original por
 * referencia y `summary` permite registrar categorías e incidencias sin
 * duplicar el universo en el release público.
 */
export function normalizeDomainRecords({ domain = "parlamentario", sourceId, sourceKey, records }) {
  if (!Array.isArray(records)) throw new Error("DOMAIN_NORMALIZATION_INVALID_RECORDS");
  const normalized = records.map((raw) => normalizeDomainRecord({ domain, raw, sourceId, sourceKey }));
  const categories = normalized.reduce((counts, row) => {
    const category = row.category ?? "movimientos";
    counts[category] = (counts[category] ?? 0) + 1;
    return counts;
  }, {});
  const issues = normalized.reduce((counts, row) => {
    for (const issue of row.qualityIssues ?? []) counts[issue] = (counts[issue] ?? 0) + 1;
    return counts;
  }, {});
  return {
    schemaVersion: 1,
    domain,
    sourceId: text(sourceId),
    sourceKey: text(sourceKey),
    recordCount: normalized.length,
    categories,
    qualityIssues: issues,
    records: normalized,
  };
}

export function summarizeDomainRecords(options) {
  const normalized = normalizeDomainRecords(options);
  return {
    schemaVersion: normalized.schemaVersion,
    domain: normalized.domain,
    sourceId: normalized.sourceId,
    sourceKey: normalized.sourceKey,
    recordCount: normalized.recordCount,
    categories: normalized.categories,
    qualityIssues: normalized.qualityIssues,
  };
}
