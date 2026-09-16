import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { summarizeR2Inventory } from "../lib/r2-inventory-audit.mjs";

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
  const inventory = loadRemoteInventory();
  console.log(JSON.stringify({ source: "r2-remote", bucket, inventoryKey, ...summarizeR2Inventory(inventory) }, null, 2));
} catch (error) {
  console.error(`[audit-r2-storage] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
