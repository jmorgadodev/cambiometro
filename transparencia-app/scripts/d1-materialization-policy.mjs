/**
 * Decide whether a D1 materialization failure is a safe deferral.
 *
 * R2/static releases are canonical for the public site. D1 is an optional
 * projection, so a known quota or missing-asset condition must be visible in
 * CI without turning an otherwise valid publication into a false failure.
 */
const DEFERRED_FAILURES = Object.freeze([
  {
    reason: "daily_rows_read_limit",
    // Cloudflare has emitted several equivalent messages over time. Keep all
    // of them deferrable so an optional D1 projection never blocks the
    // canonical R2/static publication.
    pattern: /(?:code\s*:\s*7500|rows[_\s-]*read|free\s+tier.*row\s+read|daily.*row\s+read|daily\s+limit)/i,
  },
  { reason: "asset_unavailable", pattern: /D1_ASSET_UNAVAILABLE|asset unavailable/i },
  { reason: "database_size_limit", pattern: /Exceeded maximum DB size|maximum database size/i },
]);

export function classifyD1MaterializationFailure(output) {
  const text = String(output ?? "");
  return DEFERRED_FAILURES.find(({ pattern }) => pattern.test(text))?.reason ?? null;
}

export function summaryForD1Deferral(reason, sources = "unspecified") {
  return [
    "### D1 materialization deferred",
    `- Source(s): ${sources}`,
    `- Reason: ${reason}`,
    "- R2/Pages remains the canonical public projection; D1 will be retried in a later safe quota window.",
  ].join("\n");
}
