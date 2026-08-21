import { deterministicSample, validateV7 } from "./audit-core.mjs";

export function auditQuarantinedV7(anomalies, regularIds = new Set()) {
  return (anomalies ?? []).map((anomaly) => {
    const record = anomaly?.record ?? {};
    const id = String(anomaly?.id ?? record.id ?? "");
    if (regularIds.has(id)) throw new Error(`AUDIT_V7_QUARANTINE_LEAK:${id}`);
    const check = validateV7({
      monthlySalary: record.remuneracion_bruta_mensual,
      overtimeHours: record.horas_extras_mes_anterior,
    });
    if (anomaly?.validation !== "V7" || anomaly?.severity !== "ALTA" || check.status !== "ALTA") {
      throw new Error(`AUDIT_V7_QUARANTINE_INVALID:${id}`);
    }
    return {
      id,
      status: "ALTA",
      violations: check.violations,
      sourceUrl: anomaly.source_url ?? record.url ?? record.fuente ?? null,
      record,
      excludedFromRegular: true,
    };
  });
}

export function classifyR10PurchaseLayer({ projection, site }) {
  if (projection === null || projection === undefined || site === null || site === undefined) {
    return { status: "FUENTE_NO_DISPONIBLE", difference: null };
  }
  const difference = Number(projection) - Number(site);
  return { status: difference === 0 ? "OK" : "CRITICA", difference };
}

export function requireFields(rows, fields, label) {
  if (!Array.isArray(rows)) throw new Error(`AUDIT_INVALID_SCHEMA:${label}:array`);
  for (const row of rows) {
    for (const field of fields) if (!(field in row)) throw new Error(`AUDIT_INVALID_SCHEMA:${label}:${field}`);
  }
  return rows;
}

export function deduplicateBy(rows, keyOf) {
  const seen = new Set();
  const duplicates = [];
  const unique = [];
  for (const row of rows) {
    const key = String(keyOf(row));
    if (seen.has(key)) duplicates.push(key);
    else {
      seen.add(key);
      unique.push(row);
    }
  }
  return { rows: unique, duplicates: [...new Set(duplicates)].sort() };
}

export function sampleByEntity(rows, ratio, entityOf, idOf) {
  const groups = new Map();
  for (const row of rows) {
    const key = String(entityOf(row));
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([, group]) => deterministicSample(group, ratio, idOf));
}

export function sumNumericFields(rows, fields) {
  return Object.fromEntries(fields.map((field) => [field, rows.reduce((sum, row) => sum + Number(row[field] ?? 0), 0)]));
}
