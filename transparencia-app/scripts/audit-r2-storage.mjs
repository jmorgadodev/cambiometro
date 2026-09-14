import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { summarizeR2Storage } from "./etl/r2-storage.mjs";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function readInventory(path) {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function downloadInventory(bucket, key, output) {
  const wrangler = resolve("node_modules/wrangler/bin/wrangler.js");
  const result = spawnSync(process.execPath, [wrangler, "r2", "object", "get", `${bucket}/${key}`, "--file", output, "--remote"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) throw new Error(`R2_STORAGE_INVENTORY_READ_FAILED:${result.stderr?.trim() ?? result.status}`);
}

function main() {
  const suppliedPath = option("--inventory");
  const temp = mkdtempSync(join(tmpdir(), "cambiometro-r2-storage-"));
  try {
    const path = suppliedPath ?? join(temp, "storage.json");
    if (!suppliedPath) downloadInventory(option("--bucket", "transparencia-public-data"), option("--key", "catalog/v1/storage.json"), path);
    const summary = summarizeR2Storage(readInventory(path), {
      warningRatio: Number(option("--warning-ratio", "0.8")),
      growthBlockRatio: Number(option("--growth-block-ratio", "0.9")),
    });
    console.log(JSON.stringify({ schemaVersion: 1, inventoryPath: suppliedPath ? resolve(suppliedPath) : null, ...summary }, null, 2));
    if (hasFlag("--fail-on-growth-block") && !summary.growthAllowed) process.exitCode = 2;
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

