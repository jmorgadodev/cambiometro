const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function recordData(record) {
  return record?.data && typeof record.data === "object" ? record.data : record;
}

export function normalizeReleaseCutoff(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const normalized = String(value).trim();
  const match = normalized.match(DATE_PATTERN);
  if (!match) throw new Error(`TRANSFER_RELEASE_CUTOFF_INVALID: ${value}`);
  const date = new Date(`${normalized}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime())
    || date.getUTCFullYear() !== Number(match[1])
    || date.getUTCMonth() + 1 !== Number(match[2])
    || date.getUTCDate() !== Number(match[3])
  ) {
    throw new Error(`TRANSFER_RELEASE_CUTOFF_INVALID: ${value}`);
  }
  return normalized;
}

export function inferReleaseCutoff(records) {
  let latest = null;
  for (const record of records) {
    const data = recordData(record);
    const registeredAt = String(data?.registered_at ?? data?.fecha_ingreso ?? data?.registeredAt ?? "").slice(0, 10);
    if (!DATE_PATTERN.test(registeredAt)) continue;
    if (!latest || registeredAt > latest) latest = registeredAt;
  }
  return latest;
}

export function filterRecordsForRelease(records, { registeredThrough } = {}) {
  const cutoff = normalizeReleaseCutoff(registeredThrough);
  if (!cutoff) {
    return { records: [...records], registeredThrough: null, excludedAfterCutoff: 0, missingRegisteredAt: 0 };
  }

  let excludedAfterCutoff = 0;
  let missingRegisteredAt = 0;
  const selected = [];
  for (const record of records) {
    const data = recordData(record);
    const registeredAt = String(data?.registered_at ?? data?.fecha_ingreso ?? data?.registeredAt ?? "").slice(0, 10);
    if (!DATE_PATTERN.test(registeredAt)) {
      missingRegisteredAt += 1;
      selected.push(record);
      continue;
    }
    if (registeredAt > cutoff) {
      excludedAfterCutoff += 1;
      continue;
    }
    selected.push(record);
  }

  return { records: selected, registeredThrough: cutoff, excludedAfterCutoff, missingRegisteredAt };
}
