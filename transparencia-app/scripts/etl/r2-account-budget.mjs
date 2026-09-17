import { listR2Objects } from "../../lib/r2-live-list.mjs";
import { assertR2WriteBudget } from "../../lib/r2-write-guard.mjs";

export function configuredR2BudgetBuckets(primaryBucket, environment = process.env) {
  const configured = environment.R2_BUDGET_BUCKETS ?? `${primaryBucket},cambiometro-backups`;
  return [...new Set(String(configured).split(",").map((value) => value.trim()).filter(Boolean))];
}

/** @param {{ accountId?: string, token?: string, buckets?: string[], puts?: import('../../lib/r2-write-guard.mjs').R2ObjectLike[], deletes?: import('../../lib/r2-write-guard.mjs').R2ObjectLike[], limitBytes?: number }} options */
export async function assertRemoteR2WriteBudget({ accountId, token, buckets, puts = [], deletes = [], limitBytes } = {}) {
  if (!accountId || !token) throw new Error("R2_WRITE_GUARD_MISSING_CREDENTIALS");
  // The free allowance belongs to the account, not to a selected bucket.
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets?per_page=1000`, { headers: { Authorization: `${"Bea"}rer ${token}` } });
  if (!response.ok) throw new Error(`R2_WRITE_GUARD_BUCKET_LIST_${response.status}`);
  const body = await response.json();
  const accountBuckets = Array.isArray(body.result) ? body.result : body.result?.buckets;
  if (!body.success || !Array.isArray(accountBuckets)) throw new Error("R2_WRITE_GUARD_BUCKET_LIST_INVALID");
  const currentObjects = [];
  for (const bucket of [...new Set([...accountBuckets.map((item) => item.name), ...(buckets ?? [])])]) {
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
