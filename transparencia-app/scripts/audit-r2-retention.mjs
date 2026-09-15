import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { activeProjectionVersions, planR2Retention } from "./etl/r2-storage.mjs";
import { defaultActiveProjectionManifests } from "./r2-active-manifests.mjs";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function options(name) {
  const values = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1]) values.push(process.argv[index + 1]);
  }
  return values;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function download(bucket, key, output) {
  const wrangler = resolve("node_modules/wrangler/bin/wrangler.js");
  const result = spawnSync(process.execPath, [wrangler, "r2", "object", "get", `${bucket}/${key}`, "--file", output, "--remote"], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`R2_RETENTION_INVENTORY_READ_FAILED:${result.stderr?.trim() ?? result.status}`);
}

const temp = mkdtempSync(join(tmpdir(), "cambiometro-r2-retention-"));
try {
  const inventoryPath = join(temp, "storage.json");
  const bucket = option("--bucket", "transparencia-public-data");
  download(bucket, option("--key", "catalog/v1/storage.json"), inventoryPath);
  const inventory = readJson(inventoryPath);
  const inventoryKeys = new Set((inventory.objects ?? []).map((object) => String(object?.key ?? "").trim()).filter(Boolean));
  let specs = options("--projection-manifest");
  if (specs.length === 0) {
    specs = defaultActiveProjectionManifests().map(({ dataset, key }) => {
      const output = join(temp, `${dataset}-manifest.json`);
      download(bucket, key, output);
      return `${dataset}=${output}`;
    });
  }
  const manifests = specs.map((spec) => {
    const separator = spec.indexOf("=");
    const dataset = separator > 0 ? spec.slice(0, separator).trim() : null;
    const path = separator > 0 ? spec.slice(separator + 1) : spec;
    const manifest = readJson(path);
    return dataset ? { ...manifest, dataset } : manifest;
  });
  const plan = planR2Retention(inventory, { activeVersions: activeProjectionVersions(manifests) });
  const rollbackVerification = hasFlag("--verify-rollback")
    ? plan.candidates.map((candidate, index) => {
      const indexKey = `projections/${candidate.dataset}/versions/${candidate.version}/search_index.json`;
      const indexPresent = inventoryKeys.has(indexKey);
      if (!indexPresent) {
        return { dataset: candidate.dataset, version: candidate.version, indexKey, indexPresent, rollbackReady: false, reason: "índice no está en el inventario" };
      }
      const indexPath = join(temp, `rollback-${index}.json`);
      try {
        download(bucket, indexKey, indexPath);
        const indexPayload = readJson(indexPath);
        const pageKeys = (indexPayload.pages ?? []).map((page) => page.key ?? page.path).filter(Boolean);
        const shardValues = Object.values(indexPayload.shards ?? {});
        const shardKeys = shardValues.flatMap((value) => Array.isArray(value) ? value : [value]).filter(Boolean);
        const requiredKeys = [...new Set([...pageKeys, ...shardKeys])];
        const missingKeys = requiredKeys.filter((key) => !inventoryKeys.has(key));
        return {
          dataset: candidate.dataset,
          version: candidate.version,
          indexKey,
          indexPresent,
          declaredPages: pageKeys.length,
          declaredShards: shardKeys.length,
          missingKeys: missingKeys.length,
          sampleMissingKeys: missingKeys.slice(0, 5),
          rollbackReady: missingKeys.length === 0,
        };
      } catch (error) {
        return { dataset: candidate.dataset, version: candidate.version, indexKey, indexPresent, rollbackReady: false, reason: error instanceof Error ? error.message : String(error) };
      }
    })
    : null;
  console.log(JSON.stringify({
    mode: "dry-run",
    deletionPerformed: false,
    projectionManifestCount: manifests.length,
    rollbackVerification,
    ...plan,
    candidates: plan.candidates.map(({ keys, ...candidate }) => ({
      ...candidate,
      keyCount: keys.length,
      sampleKeys: keys.slice(0, 5),
    })),
  }, null, 2));
} finally {
  rmSync(temp, { recursive: true, force: true });
}
