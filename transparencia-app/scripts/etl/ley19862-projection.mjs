import { filterRecordsForRelease, inferReleaseCutoff } from "./transfer-release-cutoff.mjs";
import { stableStringify } from "./core.mjs";

function textOrNull(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function stableCompare(a, b) {
  return String(a).localeCompare(String(b), "es", { sensitivity: "base" });
}

function aggregate(records, key) {
  const grouped = new Map();
  for (const record of records) {
    const entity = record[key];
    const rut = textOrNull(entity?.rut_juridico);
    const name = textOrNull(entity?.name);
    if (!rut || !name) continue;
    const id = `${rut}\u0000${name}`;
    const current = grouped.get(id) ?? {
      name,
      rut,
      class: textOrNull(entity?.class),
      total_clp: 0,
      count: 0,
      counterparties: new Map(),
    };
    current.total_clp += record.monto_clp;
    current.count += 1;
    const counterparty = key === "receiver" ? record.emitter?.name : record.receiver?.name;
    const counterpartyName = textOrNull(counterparty);
    if (counterpartyName) {
      current.counterparties.set(
        counterpartyName,
        (current.counterparties.get(counterpartyName) ?? 0) + record.monto_clp,
      );
    }
    grouped.set(id, current);
  }
  return [...grouped.values()]
    .sort((a, b) => b.total_clp - a.total_clp || stableCompare(a.rut, b.rut))
    .map(({ counterparties, ...entry }) => ({
      ...entry,
      ...(key === "receiver"
        ? {
            top_emisores: [...counterparties.entries()]
              .sort((a, b) => b[1] - a[1] || stableCompare(a[0], b[0]))
              .slice(0, 3)
              .map(([name]) => name),
          }
        : {}),
    }));
}

export function buildLey19862Projection(records, { generatedAt, sampleSize = 1000, registeredThrough, dedupeExact = false } = {}) {
  const filtered = filterRecordsForRelease(records, { registeredThrough });
  if (filtered.missingRegisteredAt > 0) {
    throw new Error(`LEY_19862_REGISTERED_AT_MISSING: ${filtered.missingRegisteredAt}`);
  }
  const effectiveRegisteredThrough = filtered.registeredThrough ?? inferReleaseCutoff(records);
  const candidates = filtered.records
    .map((record) => record?.data ?? record)
    .filter(
      (record) =>
        record &&
        typeof record === "object" &&
        Number.isSafeInteger(record.monto_clp) &&
        record.monto_clp >= 0 &&
        textOrNull(record.id),
    );

  const seen = new Set();
  const unique = [];
  let duplicateExactRows = 0;
  const recordsById = new Map();
  for (const record of candidates) {
    const previous = recordsById.get(record.id);
    if (previous) {
      if (!dedupeExact || stableStringify(previous) !== stableStringify(record)) {
        throw new Error(`LEY_19862_DUPLICATE_ID: ${record.id}`);
      }
      duplicateExactRows += 1;
      continue;
    }
    recordsById.set(record.id, record);
    unique.push(record);
  }
  const valid = unique.sort((a, b) => stableCompare(a.fecha, b.fecha) || stableCompare(a.id, b.id));
  for (const record of valid) {
    if (seen.has(record.id)) throw new Error(`LEY_19862_DUPLICATE_ID: ${record.id}`);
    seen.add(record.id);
  }

  const byYear = {};
  for (const record of valid) {
    const year = /^\d{4}/.exec(textOrNull(record.fecha) ?? textOrNull(record.period) ?? "")?.[0];
    if (!year) continue;
    byYear[year] ??= { count: 0, total: 0 };
    byYear[year].count += 1;
    byYear[year].total += record.monto_clp;
  }

  const receivers = new Set(valid.map((record) => textOrNull(record.receiver?.rut_juridico)).filter(Boolean));
  const emitters = new Set(valid.map((record) => textOrNull(record.emitter?.rut_juridico)).filter(Boolean));
  return {
    generatedAt: generatedAt ?? new Date().toISOString(),
    source: {
      id: "ley-19862",
      method: "official-monthly-csv",
      registeredThrough: effectiveRegisteredThrough,
      sourceRows: records.length,
      duplicateExactRows,
      excludedAfterCutoff: filtered.excludedAfterCutoff,
      periods: Object.keys(byYear).sort(),
    },
    kpis: {
      total_monto_clp: valid.reduce((sum, record) => sum + record.monto_clp, 0),
      total_transfers: valid.length,
      total_receptores: receivers.size,
      total_emisores: emitters.size,
    },
    by_year: Object.fromEntries(Object.entries(byYear).sort(([a], [b]) => stableCompare(a, b))),
    top_receptores: aggregate(valid, "receiver"),
    top_emisores: aggregate(valid, "emitter"),
    transfers_sample: valid.slice(0, sampleSize).map((record) => ({
      id: record.id,
      fecha: textOrNull(record.fecha),
      period: textOrNull(record.period),
      title: textOrNull(record.title),
      description: textOrNull(record.description),
      classification: textOrNull(record.classification),
      emitter_name: textOrNull(record.emitter?.name),
      emitter_rut: textOrNull(record.emitter?.rut_juridico),
      receiver_name: textOrNull(record.receiver?.name),
      receiver_rut: textOrNull(record.receiver?.rut_juridico),
      monto_clp: record.monto_clp,
      url: textOrNull(record.url),
      municipality: textOrNull(record.municipality),
    })),
  };
}
