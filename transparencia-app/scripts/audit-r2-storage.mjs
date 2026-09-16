import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { summarizeR2Inventory } from "../lib/r2-inventory-audit.mjs";
import { listR2Objects } from "../lib/r2-live-list.mjs";

const bucket = process.env.R2_BUCKET || "transparencia-public-data";
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
  const cached = loadRemoteInventory();
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !token) throw new Error("R2_STORAGE_AUDIT_MISSING_CLOUDFLARE_CREDENTIALS");
  const objects = await listR2Objects({ accountId, token, bucket });
  const live = { limitBytes: cached.limitBytes, generatedAt: new Date().toISOString(), objects };
  const cachedKeys = new Set((cached.objects ?? []).map((object) => object.key));
  const liveKeys = new Set(objects.map((object) => object.key));
  console.log(JSON.stringify({
    source: "r2-live-list",
    bucket,
    inventoryKey,
    cachedObjectCount: cachedKeys.size,
    liveOnlyObjects: objects.filter((object) => !cachedKeys.has(object.key)).length,
    cachedOnlyObjects: [...cachedKeys].filter((key) => !liveKeys.has(key)).length,
    ...summarizeR2Inventory(live),
  }, null, 2));
} catch (error) {
  console.error(`[audit-r2-storage] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
