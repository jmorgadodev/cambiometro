import { listR2Objects } from "../../lib/r2-live-list.mjs";
import { assertR2WriteBudget } from "../../lib/r2-write-guard.mjs";

const MAX_PUBLICATION_CLASS_A = 50_000;
const MAX_PUBLICATION_CLASS_B = 500_000;

function operationProjection(puts, inventoryRequests = 0) {
  // Reserve three attempts, multipart initialization/completion and readbacks.
  const uploads = puts.reduce((total, item) => {
    if (!Number.isSafeInteger(item.size) || item.size < 0) throw new Error("R2_OPERATIONS_UPLOAD_SIZE_INVALID");
    return total + 3 * (Math.max(1, Math.ceil(item.size / (5 * 1024 * 1024))) + 2);
  }, 0);
  const estimatedClassA = uploads + inventoryRequests + 100;
  const estimatedClassB = uploads + 100;
  if (estimatedClassA > MAX_PUBLICATION_CLASS_A || estimatedClassB > MAX_PUBLICATION_CLASS_B) {
    throw new Error("R2_PUBLICATION_OPERATION_ESTIMATE_TOO_LARGE");
  }
  return {
    method: "per-publication-estimate",
    estimatedClassA,
    estimatedClassB,
    maxPublicationClassA: MAX_PUBLICATION_CLASS_A,
    maxPublicationClassB: MAX_PUBLICATION_CLASS_B,
    accountTotals: "not queried; review the Cloudflare R2 dashboard before large or historical loads",
  };
}

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
  let inventoryRequests = 1;
  for (const bucket of [...new Set([...accountBuckets.map((item) => item.name), ...(buckets ?? [])])]) {
    const objects = await listR2Objects({ accountId, token, bucket });
    inventoryRequests += Math.ceil(objects.length / 1000) + 1;
    currentObjects.push(...objects.map((object) => ({ ...object, bucket })));
  }
  const storageBudget = assertR2WriteBudget({
    currentObjects,
    puts,
    deletes,
    limitBytes: Math.min(10_000_000_000, limitBytes ?? Number(process.env.R2_LIMIT_BYTES ?? 10_000_000_000)),
  });
  return { ...storageBudget, operationsBudget: operationProjection(puts, inventoryRequests) };
}
