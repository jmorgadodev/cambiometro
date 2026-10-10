import { assertR2WriteBudget } from "../../lib/r2-write-guard.mjs";

function validPeriod(period) {
  if (typeof period !== "string") return false;
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(period)) return false;
  const date = new Date(`${period}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === period;
}

/** Pure preflight: callers retain domain schema checks and perform no writes here.
 * `actualChecksumSha256` must be computed from the candidate bytes by the caller.
 * A preparation check is not permission to publish: publication requires a budget.
 */
export function assertReleaseCandidate({
  sourceId, expectedSourceId, periods, expectedPeriods, records, recordCount,
  checksumSha256, actualChecksumSha256, previous, complete,
  externalUnavailable = false, maxDropRatio = 0, publication = false, budget,
}) {
  const fail = (reason) => { throw new Error(`ETL_CANDIDATE_${reason}`); };
  if (externalUnavailable) fail("EXTERNAL_UNAVAILABLE");
  if (complete !== true) fail("INCOMPLETE");
  if (!sourceId || sourceId !== expectedSourceId) fail("SOURCE_MISMATCH");
  if (!Array.isArray(periods) || !periods.length || periods.some((period) => !validPeriod(period))) fail("PERIOD_INVALID");
  if (expectedPeriods && JSON.stringify([...new Set(periods)].sort()) !== JSON.stringify([...new Set(expectedPeriods)].sort())) fail("PERIOD_MISMATCH");
  if (!/^[a-f0-9]{64}$/.test(checksumSha256 ?? "") || checksumSha256 !== actualChecksumSha256) fail("CHECKSUM_INVALID");
  if (!Array.isArray(records) || !Number.isSafeInteger(recordCount) || recordCount !== records.length) fail("COUNT_INVALID");
  if (!recordCount) fail("EMPTY");
  const ids = records.map((record) => record?.id);
  if (ids.some((id) => typeof id !== "string" || !id.trim())) fail("ID_INVALID");
  if (new Set(ids).size !== ids.length) fail("DUPLICATE_ID");
  if (!Number.isFinite(maxDropRatio) || maxDropRatio < 0 || maxDropRatio > 1) fail("DROP_LIMIT_INVALID");
  if (previous && (!Number.isSafeInteger(previous.recordCount) || previous.recordCount < 0)) fail("PREVIOUS_COUNT_INVALID");
  if (previous && recordCount < previous.recordCount * (1 - maxDropRatio)) fail("COUNT_REGRESSION");
  const status = previous?.checksumSha256 === checksumSha256 ? "unchanged" : "valid_candidate";
  if ((publication || budget) && (!Array.isArray(budget?.currentObjects) || !Array.isArray(budget?.puts))) fail("BUDGET_REQUIRED");
  const storageBudget = budget ? assertR2WriteBudget(budget) : null;
  return { status, sourceId, recordCount, periods: [...new Set(periods)].sort(), checksumSha256, storageBudget };
}
