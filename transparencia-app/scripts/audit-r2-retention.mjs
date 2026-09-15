import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { activeProjectionVersions, planR2Retention } from "./etl/r2-storage.mjs";

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
  download(option("--bucket", "transparencia-public-data"), option("--key", "catalog/v1/storage.json"), inventoryPath);
  const specs = options("--projection-manifest");
  const manifests = specs.map((spec) => {
    const separator = spec.indexOf("=");
    const dataset = separator > 0 ? spec.slice(0, separator).trim() : null;
    const path = separator > 0 ? spec.slice(separator + 1) : spec;
    const manifest = readJson(path);
    return dataset ? { ...manifest, dataset } : manifest;
  });
  const plan = planR2Retention(readJson(inventoryPath), { activeVersions: activeProjectionVersions(manifests) });
  console.log(JSON.stringify({
    mode: "dry-run",
    deletionPerformed: false,
    projectionManifestCount: manifests.length,
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
