import { mergeRecordsById } from "./history.mjs";
import { createHash } from "node:crypto";
import { assertReleaseCandidate } from "./release-candidate.mjs";

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
export function reconcileSenateExpenseHistory(previous = [], refreshed = [], { publishedRecords = previous } = {}) {
  if (!Array.isArray(previous) || !Array.isArray(refreshed) || !Array.isArray(publishedRecords)) {
    throw new Error("SENADO_EXPENSE_RECORDS_INVALID");
  }
  if (refreshed.length === 0) throw new Error("ETL_CANDIDATE_EMPTY");

  const refreshedByPeriod = new Map();
  for (const record of refreshed) {
    const period = expensePeriod(record, { required: true });
    if (period < RECONCILIATION_START_PERIOD) {
      throw new Error("SENADO_EXPENSE_PERIOD_BEFORE_2026");
    }
    const rows = refreshedByPeriod.get(period) ?? [];
    rows.push(record);
    refreshedByPeriod.set(period, rows);
  }

  const previousCounts = new Map();
  for (const record of publishedRecords) {
    const period = expensePeriod(record);
    previousCounts.set(period, (previousCounts.get(period) ?? 0) + 1);
  }
  // A growing month must not conceal lost rows in another refreshed month.
  // Official downward revisions require review before replacing the last valid cut.
  for (const [period, records] of refreshedByPeriod) {
    const checksum = createHash("sha256").update(JSON.stringify(records)).digest("hex");
    assertReleaseCandidate({
      sourceId: "gastos_senado", expectedSourceId: "gastos_senado",
      periods: [period], expectedPeriods: [period], records, recordCount: records.length,
      checksumSha256: checksum, actualChecksumSha256: checksum,
      previous: { recordCount: previousCounts.get(period) ?? 0 },
      complete: true, maxDropRatio: 0,
    });
  }

  const retained = previous.filter((record) => {
    const period = expensePeriod(record);
    return !period || period < RECONCILIATION_START_PERIOD || !refreshedByPeriod.has(period);
  });

  return mergeRecordsById(retained, refreshed);
}
