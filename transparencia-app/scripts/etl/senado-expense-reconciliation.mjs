import { mergeRecordsById } from "./history.mjs";

const RECONCILIATION_START_PERIOD = "2026-01";

function expensePeriod(record, { required = false } = {}) {
  const value = record?.periodo ?? record?.period ?? record?.fecha?.slice?.(0, 7);
  const period = typeof value === "string" ? value : "";
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return period;
  if (required) throw new Error("SENADO_EXPENSE_PERIOD_REQUIRED");
  return null;
}

/**
 * Refresh published Senate expense months from the official source while
 * preserving older history and periods that were not part of this response.
 */
export function reconcileSenateExpenseHistory(previous = [], refreshed = []) {
  if (!Array.isArray(previous) || !Array.isArray(refreshed)) {
    throw new Error("SENADO_EXPENSE_RECORDS_INVALID");
  }

  const refreshedPeriods = new Set();
  for (const record of refreshed) {
    const period = expensePeriod(record, { required: true });
    if (period < RECONCILIATION_START_PERIOD) {
      throw new Error("SENADO_EXPENSE_PERIOD_BEFORE_2026");
    }
    refreshedPeriods.add(period);
  }

  const retained = previous.filter((record) => {
    const period = expensePeriod(record);
    return !period || period < RECONCILIATION_START_PERIOD || !refreshedPeriods.has(period);
  });

  return mergeRecordsById(retained, refreshed);
}
