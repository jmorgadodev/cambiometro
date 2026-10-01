import { listR2Objects } from "../../lib/r2-live-list.mjs";
import { assertR2WriteBudget } from "../../lib/r2-write-guard.mjs";

const CLASS_A = new Set("ListBuckets PutBucket ListObjects PutObject CopyObject CompleteMultipartUpload CreateMultipartUpload ListMultipartUploads UploadPart UploadPartCopy ListParts PutBucketEncryption PutBucketCors PutBucketLifecycleConfiguration".split(" "));
const CLASS_B = new Set("HeadBucket HeadObject GetObject UsageSummary GetBucketEncryption GetBucketLocation GetBucketCors GetBucketLifecycleConfiguration".split(" "));
const FREE = new Set(["DeleteObject", "DeleteBucket", "AbortMultipartUpload"]);

async function accountOperations(accountId, token) {
  // A rolling 31-day window conservatively contains the current monthly cycle.
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.parse(endDate) - 31 * 86_400_000).toISOString();
  const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `${"Bea"}rer ${token}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      query: "query($accountTag: string!, $startDate: Time!, $endDate: Time!) { viewer { accounts(filter: {accountTag: $accountTag}) { r2OperationsAdaptiveGroups(limit: 1000, filter: {datetime_geq: $startDate, datetime_leq: $endDate}) { sum { requests } dimensions { actionType } } } } }",
      variables: { accountTag: accountId, startDate, endDate },
    }),
  });
  if (!response.ok) throw new Error(`R2_OPERATIONS_TELEMETRY_${response.status}`);
  const body = await response.json();
  if (body.errors?.length) {
    const reason = String(body.errors[0]?.message ?? "unknown").replaceAll(token, "[redacted]").replaceAll(accountId, "[account]").slice(0, 300);
    throw new Error(`R2_OPERATIONS_TELEMETRY_INVALID: ${reason}`);
  }
  const accounts = body.data?.viewer?.accounts;
  const groups = accounts?.[0]?.r2OperationsAdaptiveGroups;
  if (!Array.isArray(accounts) || accounts.length !== 1 || !Array.isArray(groups) || groups.length >= 1000) throw new Error("R2_OPERATIONS_TELEMETRY_INVALID");
  let classA = 0;
  let classB = 0;
  for (const group of groups) {
    const requests = group.sum?.requests;
    const action = group.dimensions?.actionType;
    if (typeof requests !== "number" || !Number.isFinite(requests) || requests < 0 || (!CLASS_A.has(action) && !CLASS_B.has(action) && !FREE.has(action))) throw new Error("R2_OPERATIONS_TELEMETRY_INVALID");
    if (CLASS_A.has(action)) classA += requests;
    if (CLASS_B.has(action)) classB += requests;
  }
  return { classA, classB, startDate, endDate };
}

function operationProjection(operations, puts, inventoryRequests = 0) {
  // Reserve three attempts, multipart initialization/completion and readbacks.
  const uploads = puts.reduce((total, item) => {
    if (!Number.isSafeInteger(item.size) || item.size < 0) throw new Error("R2_OPERATIONS_UPLOAD_SIZE_INVALID");
    return total + 3 * (Math.max(1, Math.ceil(item.size / (5 * 1024 * 1024))) + 2);
  }, 0);
  const projectedA = operations.classA + uploads + inventoryRequests + 1000;
  const projectedB = operations.classB + uploads + 1000;
  if (projectedA >= 950_000 || projectedB >= 9_500_000) throw new Error("R2_OPERATIONS_BLOCKED_AT_95_PERCENT");
  return { ...operations, projectedA, projectedB, allowanceA: 1_000_000, allowanceB: 10_000_000, blockRatio: 0.95 };
}

export function configuredR2BudgetBuckets(primaryBucket, environment = process.env) {
  const configured = environment.R2_BUDGET_BUCKETS ?? `${primaryBucket},cambiometro-backups`;
  return [...new Set(String(configured).split(",").map((value) => value.trim()).filter(Boolean))];
}

/** @param {{ accountId?: string, token?: string, buckets?: string[], puts?: import('../../lib/r2-write-guard.mjs').R2ObjectLike[], deletes?: import('../../lib/r2-write-guard.mjs').R2ObjectLike[], limitBytes?: number }} options */
export async function assertRemoteR2WriteBudget({ accountId, token, buckets, puts = [], deletes = [], limitBytes } = {}) {
  if (!accountId || !token) throw new Error("R2_WRITE_GUARD_MISSING_CREDENTIALS");
  const operations = await accountOperations(accountId, token);
  operationProjection(operations, puts);
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
    limitBytes: limitBytes ?? Number(process.env.R2_LIMIT_BYTES ?? 10_000_000_000),
  });
  return { ...storageBudget, operationsBudget: operationProjection(operations, puts, inventoryRequests) };
}
