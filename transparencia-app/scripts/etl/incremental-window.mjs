const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value) {
  return ISO_DATE.test(String(value ?? "")) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function subtractDays(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * Resolves a bounded refresh window from the last event in the local snapshot.
 * The overlap lets official sources correct or complete a recently published
 * event without re-reading the entire current period.
 */
export function resolveIncrementalFrom({
  requestedFrom,
  minimumFrom,
  previousRecords = [],
  overlapDays = 7,
}) {
  if (!validDate(requestedFrom) || !validDate(minimumFrom)) throw new Error("ETL_INCREMENTAL_INVALID_DATE");
  if (!Number.isSafeInteger(overlapDays) || overlapDays < 0 || overlapDays > 31) throw new Error("ETL_INCREMENTAL_INVALID_OVERLAP");

  const latest = previousRecords
    .map((record) => String(record?.fecha ?? record?.date ?? "").slice(0, 10))
    .filter(validDate)
    .sort()
    .at(-1);
  const candidate = latest ? subtractDays(latest, overlapDays) : requestedFrom;
  return [requestedFrom, minimumFrom, candidate].sort().at(-1);
}

