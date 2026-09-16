import { listR2Objects } from "../../lib/r2-live-list.mjs";
import { assertR2WriteBudget } from "../../lib/r2-write-guard.mjs";

export function configuredR2BudgetBuckets(primaryBucket, environment = process.env) {
  const configured = environment.R2_BUDGET_BUCKETS ?? `${primaryBucket},cambiometro-backups`;
  return [...new Set(String(configured).split(",").map((value) => value.trim()).filter(Boolean))];
}

export async function assertRemoteR2WriteBudget({ accountId, token, buckets, puts = [], deletes = [], limitBytes } = {}) {
  if (!accountId || !token) throw new Error("R2_WRITE_GUARD_MISSING_CREDENTIALS");
  const currentObjects = [];
  for (const bucket of [...new Set(buckets ?? [])]) {
    const objects = await listR2Objects({ accountId, token, bucket });
    currentObjects.push(...objects.map((object) => ({ ...object, bucket })));
  }
  return assertR2WriteBudget({
    currentObjects,
    puts,
    deletes,
    limitBytes: limitBytes ?? Number(process.env.R2_LIMIT_BYTES ?? 10_000_000_000),
  });
}
