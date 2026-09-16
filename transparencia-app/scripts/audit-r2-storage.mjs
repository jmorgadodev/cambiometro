import { summarizeR2Inventory } from "../lib/r2-inventory-audit.mjs";
import { listR2Objects } from "../lib/r2-live-list.mjs";

const bucket = process.env.R2_BUCKET || "transparencia-public-data";
const buckets = (process.env.R2_BUCKETS || `${bucket},cambiometro-backups`)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const inventoryKey = process.env.R2_INVENTORY_KEY || "catalog/v1/storage.json";

async function loadRemoteInventory({ accountId, token }) {
  const objectUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(inventoryKey)}`;
  const response = await fetch(objectUrl, { headers: { Authorization: `${"Bea"}rer ${token}` } });
  if (!response.ok) throw new Error(`R2_STORAGE_INVENTORY_HTTP_${response.status}`);
  const output = await response.text();
  try {
    return JSON.parse(output);
  } catch {
    throw new Error("R2_STORAGE_INVENTORY_NOT_JSON");
  }
}

try {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !token) throw new Error("R2_STORAGE_AUDIT_MISSING_CLOUDFLARE_CREDENTIALS");
  const reports = [];
  const allObjects = [];
  for (const currentBucket of buckets) {
    const objects = await listR2Objects({ accountId, token, bucket: currentBucket });
    allObjects.push(...objects.map((object) => ({ ...object, bucket: currentBucket })));
    reports.push({ bucket: currentBucket, ...summarizeR2Inventory({ limitBytes: 10_000_000_000, generatedAt: new Date().toISOString(), objects }) });
  }
  const cached = await loadRemoteInventory({ accountId, token });
  const publicObjects = allObjects.filter((object) => object.bucket === bucket);
  const cachedKeys = new Set((cached.objects ?? []).map((object) => object.key));
  const liveKeys = new Set(publicObjects.map((object) => object.key));
  const accountObjects = allObjects.map((object) => Object.fromEntries(
    Object.entries(object).filter(([key]) => key !== "bucket"),
  ));
  const account = summarizeR2Inventory({ limitBytes: 10_000_000_000, generatedAt: new Date().toISOString(), objects: accountObjects });
  console.log(JSON.stringify({
    source: "r2-live-list-account",
    buckets: reports,
    inventoryKey,
    cachedObjectCount: cachedKeys.size,
    liveOnlyObjects: publicObjects.filter((object) => !cachedKeys.has(object.key)).length,
    cachedOnlyObjects: [...cachedKeys].filter((key) => !liveKeys.has(key)).length,
    account: {
      usedBytes: account.usedBytes,
      limitBytes: account.limitBytes,
      ratio: account.ratio,
      status: account.status,
      objectCount: account.objectCount,
    },
  }, null, 2));
} catch (error) {
  console.error(`[audit-r2-storage] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
