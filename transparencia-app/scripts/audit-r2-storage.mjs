import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { summarizeR2Inventory } from "../lib/r2-inventory-audit.mjs";
import { listR2Objects } from "../lib/r2-live-list.mjs";

const bucket = process.env.R2_BUCKET || "transparencia-public-data";
const buckets = (process.env.R2_BUCKETS || `${bucket},cambiometro-backups`)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const inventoryKey = process.env.R2_INVENTORY_KEY || "catalog/v1/storage.json";

function loadRemoteInventory() {
  const wrangler = resolve("node_modules/wrangler/bin/wrangler.js");
  const result = spawnSync(process.execPath, [wrangler, "r2", "object", "get", `${bucket}/${inventoryKey}`, "--remote", "--pipe"], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(result.stderr?.trim() || `WRANGLER_EXIT_${result.status}`);
  const output = String(result.stdout ?? "");
  const start = output.indexOf("{");
  if (start < 0) throw new Error("R2_STORAGE_INVENTORY_NOT_JSON");
  return JSON.parse(output.slice(start));
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
  const cached = loadRemoteInventory();
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
