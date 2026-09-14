const DEFAULT_AMOUNT_FIELDS = [
  "montoBruto",
  "monto_bruto",
  "bruto_mensual",
  "monto_clp",
  "monto",
  "amount",
];

const DEFAULT_ORGANIZATION_FIELDS = [
  "organismoNormalizado",
  "organismo_normalizado",
  "organismo",
  "organismoOriginal",
];

const DEFAULT_ROLE_FIELDS = [
  "cargoNormalizado",
  "cargo_normalizado",
  "cargo",
  "cargoOriginal",
];

function text(value) {
  return String(value ?? "").trim();
}

function normalized(value) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function firstValue(record, fields) {
  for (const field of fields) {
    const value = record?.[field];
    if (value !== null && value !== undefined && text(value) !== "") return value;
  }
  return null;
}

function numericValue(record, fields) {
  const value = firstValue(record, fields);
  if (value === null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function recordKey(record, keyFields, periodIndex, recordIndex) {
  const parts = keyFields.map((field) => normalized(record?.[field]));
  if (parts.every(Boolean)) {
    return { key: parts.join("|"), quality: "explicit" };
  }
  const recordId = text(record?.recordId ?? record?.record_id ?? record?.id);
  if (recordId) {
    return {
      key: `record-id|${normalized(recordId)}`,
      quality: "fallback-record-id",
    };
  }
  return {
    key: `period-row|${periodIndex}|${recordIndex}`,
    quality: "fallback-period-row",
  };
}

function validatePeriod(period, index, keyFields) {
  if (!period || typeof period !== "object") throw new Error(`Historial R2: período ${index + 1} inválido`);
  if (!text(period.period)) throw new Error(`Historial R2: período ${index + 1} sin period`);
  if (!text(period.releaseId)) throw new Error(`Historial R2: ${period.period} sin releaseId`);
  if (!text(period.checksum)) throw new Error(`Historial R2: ${period.period} sin checksum`);
  if (!Array.isArray(period.records)) throw new Error(`Historial R2: ${period.period} sin records[]`);

  const seen = new Map();
  const rows = period.records.map((original, recordIndex) => {
    if (!original || typeof original !== "object" || Array.isArray(original)) {
      throw new Error(`Historial R2: ${period.period} contiene una fila inválida en ${recordIndex}`);
    }
    const identity = recordKey(original, keyFields, index, recordIndex);
    const previous = seen.get(identity.key);
    if (previous !== undefined) {
      throw new Error(`Historial R2: clave duplicada ${identity.key} en ${period.period} (filas ${previous} y ${recordIndex})`);
    }
    seen.set(identity.key, recordIndex);
    return {
      key: identity.key,
      keyQuality: identity.quality,
      original,
      amount: numericValue(original, DEFAULT_AMOUNT_FIELDS),
      organization: text(firstValue(original, DEFAULT_ORGANIZATION_FIELDS)),
      role: text(firstValue(original, DEFAULT_ROLE_FIELDS)),
    };
  });

  return {
    period: text(period.period),
    releaseId: text(period.releaseId),
    checksum: text(period.checksum),
    publishedAt: text(period.publishedAt) || null,
    rows,
  };
}

function comparePeriods(previous, current) {
  const previousByKey = new Map(previous.rows.map((row) => [row.key, row]));
  const currentByKey = new Map(current.rows.map((row) => [row.key, row]));
  const added = [];
  const removed = [];
  const amountChanges = [];
  const organizationChanges = [];

  for (const [key, row] of currentByKey) {
    const oldRow = previousByKey.get(key);
    if (!oldRow) {
      added.push({ key, period: current.period, original: row.original });
      continue;
    }
    if (oldRow.amount !== null && row.amount !== null && oldRow.amount !== row.amount) {
      amountChanges.push({
        key,
        period: current.period,
        previousPeriod: previous.period,
        amountBefore: oldRow.amount,
        amountAfter: row.amount,
        difference: row.amount - oldRow.amount,
        originalBefore: oldRow.original,
        originalAfter: row.original,
      });
    }
    if (oldRow.organization && row.organization && normalized(oldRow.organization) !== normalized(row.organization)) {
      organizationChanges.push({
        key,
        period: current.period,
        previousPeriod: previous.period,
        organizationBefore: oldRow.organization,
        organizationAfter: row.organization,
        originalBefore: oldRow.original,
        originalAfter: row.original,
      });
    }
  }

  for (const [key, row] of previousByKey) {
    if (!currentByKey.has(key)) removed.push({ key, period: current.period, original: row.original });
  }

  return {
    fromPeriod: previous.period,
    toPeriod: current.period,
    fromReleaseId: previous.releaseId,
    toReleaseId: current.releaseId,
    added,
    removed,
    amountChanges,
    organizationChanges,
  };
}

/**
 * Builds a reversible history from already paginated R2 releases.
 * It never reads R2/D1 and never mutates the supplied records.
 */
export function buildR2History(periods, options = {}) {
  if (!Array.isArray(periods) || periods.length === 0) throw new Error("Historial R2: se requiere al menos un período");
  const keyFields = Array.isArray(options.keyFields) && options.keyFields.length > 0
    ? options.keyFields
    : ["personKey"];
  const normalizedPeriods = periods.map((period, index) => validatePeriod(period, index, keyFields));
  const comparisons = [];
  for (let index = 1; index < normalizedPeriods.length; index += 1) {
    comparisons.push(comparePeriods(normalizedPeriods[index - 1], normalizedPeriods[index]));
  }

  const historyByKey = {};
  for (const period of normalizedPeriods) {
    for (const row of period.rows) {
      historyByKey[row.key] ??= [];
      historyByKey[row.key].push({
        period: period.period,
        releaseId: period.releaseId,
        checksum: period.checksum,
        keyQuality: row.keyQuality,
        original: row.original,
      });
    }
  }

  return {
    keyFields: [...keyFields],
    periods: normalizedPeriods.map((period) => ({
      period: period.period,
      releaseId: period.releaseId,
      checksum: period.checksum,
      publishedAt: period.publishedAt,
      count: period.rows.length,
      fallbackKeys: period.rows.filter((row) => row.keyQuality !== "explicit").length,
    })),
    comparisons,
    historyByKey,
  };
}

