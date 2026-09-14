/**
 * Decide si un release aislado puede promocionarse.
 *
 * Esta compuerta no publica ni elimina archivos. Su propósito es que cada
 * fuente tenga una decisión explícita antes de entrar a un publicador R2.
 * Un release fallido conserva el anterior; nunca se interpreta como cero.
 */
export function evaluateSourcePromotion({
  sourceId,
  release = {},
  previous = {},
  checks = {},
  allowPartial = false,
  compareCount = true,
}) {
  if (!sourceId) throw new Error("SOURCE_PROMOTION_INVALID_SOURCE");
  const currentCount = Number(release.recordCount ?? 0);
  const previousCount = Number(previous.recordCount ?? 0);
  const expectedCount = Number(release.expectedCount ?? 0);
  const status = String(release.status ?? "unknown");
  const reasons = [];

  if (!Number.isSafeInteger(currentCount) || currentCount < 0) reasons.push("invalid_current_count");
  if (!Number.isSafeInteger(previousCount) || previousCount < 0) reasons.push("invalid_previous_count");
  if (checks.testsPassed !== true) reasons.push("tests_not_green");
  if (checks.checksumOk !== true) reasons.push("checksum_not_verified");
  if (checks.paginationOk !== true) reasons.push("pagination_not_verified");
  if (checks.d1BulkReads !== false) reasons.push("d1_bulk_reads_not_disabled");
  if (["failed", "unavailable", "empty", "summary-only"].includes(status)) reasons.push(`release_${status}`);
  if (status === "partial" && !allowPartial) reasons.push("partial_release_requires_explicit_approval");
  if (currentCount === 0 && (previousCount > 0 || expectedCount > 0)) reasons.push("empty_release_would_hide_previous");
  if (compareCount && previousCount > 0 && currentCount > 0 && currentCount / previousCount < 0.5) reasons.push("unexpected_count_drop");

  const preservePrevious = previousCount > 0 && reasons.some((reason) => (
    reason === "release_failed"
      || reason === "release_unavailable"
      || reason === "release_empty"
      || reason === "empty_release_would_hide_previous"
      || reason === "unexpected_count_drop"
  ));
  return {
    sourceId,
    action: reasons.length === 0 ? "promote" : preservePrevious ? "preserve_previous" : "hold",
    currentCount,
    previousCount,
    expectedCount,
    reasons,
  };
}
