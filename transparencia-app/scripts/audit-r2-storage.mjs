import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { activeProjectionVersions, summarizeR2Storage } from "./etl/r2-storage.mjs";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function options(name) {
  const values = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1]) values.push(process.argv[index + 1]);
  }
  return values;
}

function readInventory(path) {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function readReferences(path) {
  if (!path) return null;
  const payload = readInventory(path);
  return Array.isArray(payload) ? payload : payload?.keys ?? null;
}

function readProjectionManifests(specs) {
  return specs.map((spec) => {
    const separator = spec.indexOf("=");
    const dataset = separator > 0 ? spec.slice(0, separator).trim() : null;
    const path = separator > 0 ? spec.slice(separator + 1) : spec;
    const manifest = readInventory(path);
    return dataset ? { ...manifest, dataset } : manifest;
  });
}

function collectCatalogReferences(value, inventoryKeys, result = new Set()) {
  if (typeof value === "string") {
    const key = value.trim();
    if (inventoryKeys.has(key)) result.add(key);
    return result;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectCatalogReferences(item, inventoryKeys, result);
    return result;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectCatalogReferences(item, inventoryKeys, result);
  }
  return result;
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
    const referencesPath = option("--references");
    const catalogPath = option("--catalog");
    const sourceManifestPaths = options("--source-manifest").map((value) => resolve(value));
    const projectionManifestSpecs = options("--projection-manifest");
    const projectionManifestPaths = projectionManifestSpecs.map((value) => resolve(value.includes("=") ? value.slice(value.indexOf("=") + 1) : value));
    const inventory = readInventory(path);
    const inventoryKeys = new Set((inventory.objects ?? []).map((object) => String(object?.key ?? "").trim()).filter(Boolean));
    const explicitReferences = readReferences(referencesPath);
    const catalogReferences = catalogPath ? collectCatalogReferences(readInventory(catalogPath), inventoryKeys) : [];
    const sourceManifestReferences = new Set();
    for (const manifestPath of sourceManifestPaths) {
      collectCatalogReferences(readInventory(manifestPath), inventoryKeys, sourceManifestReferences);
    }
    const activeVersions = activeProjectionVersions(readProjectionManifests(projectionManifestSpecs));
    const referencedKeys = new Set([...(explicitReferences ?? []), ...catalogReferences, ...sourceManifestReferences]);
    const summary = summarizeR2Storage(readInventory(path), {
      warningRatio: Number(option("--warning-ratio", "0.8")),
      growthBlockRatio: Number(option("--growth-block-ratio", "0.9")),
      referencedKeys: referencesPath || catalogPath ? referencedKeys : null,
      activeVersions,
    });
    console.log(JSON.stringify({
      schemaVersion: 1,
      inventoryPath: suppliedPath ? resolve(suppliedPath) : null,
      referencesPath: referencesPath ? resolve(referencesPath) : null,
      catalogPath: catalogPath ? resolve(catalogPath) : null,
      sourceManifestPaths,
      projectionManifestPaths,
      activeProjectionVersions: activeVersions,
      referencedKeyCount: referencesPath || catalogPath || sourceManifestPaths.length ? referencedKeys.size : null,
      sourceManifestReferenceCount: sourceManifestPaths.length ? sourceManifestReferences.size : null,
      ...summary,
    }, null, 2));
    if (hasFlag("--fail-on-growth-block") && !summary.growthAllowed) process.exitCode = 2;
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
