import { pathToFileURL } from "node:url";

export function parseBlockedAt(value) {
  if (!value) throw new Error("D1_BLOCKED_AT_MISSING");
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("D1_BLOCKED_AT_INVALID");
  return parsed;
}

export function nextUtcResetAt(blockedAt) {
  const date = new Date(blockedAt);
  if (Number.isNaN(date.getTime())) throw new Error("D1_BLOCKED_AT_INVALID");
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1,
  ));
}

export function isQuotaWindowOpen({ blockedAt, now = new Date() }) {
  return new Date(now).getTime() >= nextUtcResetAt(blockedAt).getTime();
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function main() {
  const rawBlockedAt = argumentValue("--blocked-at") || process.env.D1_LIMIT_REACHED_AT;
  const blockedAt = parseBlockedAt(rawBlockedAt);
  const now = new Date();
  const resetAt = nextUtcResetAt(blockedAt);
  const open = isQuotaWindowOpen({ blockedAt, now });

  console.log(JSON.stringify({
    status: open ? "ready" : "wait",
    network: "not-called",
    blockedAt: blockedAt.toISOString(),
    now: now.toISOString(),
    resetAt: resetAt.toISOString(),
    nextStep: open
      ? "run the analytics-only usage check, then one health request"
      : "do not run ETL, remote SQL, materialization or production smoke",
  }, null, 2));

  if (!open) {
    throw new Error(`D1_QUOTA_NOT_RESET:${resetAt.toISOString()}`);
  }
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  try {
    main();
  } catch (error) {
    console.error(`[d1-post-reset-preflight] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
