import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function argument(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

export function requiredProjectionKeys(catalog, requestedSources = []) {
  const selected = new Set(requestedSources);
  return (catalog?.sources ?? [])
    .filter((source) => selected.size === 0 || selected.has(source.id))
    .flatMap((source) => [source.entityKey, source.entityIndexKey])
    .filter((key) => typeof key === "string" && key.length > 0)
    .filter((key, index, keys) => keys.indexOf(key) === index)
    .sort();
}

function main() {
const root = resolve(import.meta.dirname, "..");
const snapshotPath = resolve(root, "data", "etl", "latest.json");
const catalogPath = resolve(root, "data", "lake", "catalog", "v1", "manifest.json");
const bucket = argument("--bucket", "transparencia-public-data");
const requestedSources = argument("--sources").split(",").map((value) => value.trim()).filter(Boolean);
const downloadProjections = process.argv.includes("--download-projections");

mkdirSync(dirname(snapshotPath), { recursive: true });
try {
  writeFileSync(snapshotPath, `${JSON.stringify({ generado_por: "prepare-etl-workspace", actualizado_en: null, fuentes: {} }, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
} catch (error) {
  if (error?.code !== "EEXIST") throw error;
}

let downloaded = 0;
if (downloadProjections) {
  if (!existsSync(catalogPath)) throw new Error(`ETL_CATALOG_MISSING: ${catalogPath}`);
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const wranglerBin = resolve(root, "node_modules", "wrangler", "bin", "wrangler.js");
  for (const key of requiredProjectionKeys(catalog, requestedSources)) {
    const target = resolve(root, "data", "lake", key);
    const lakeRoot = resolve(root, "data", "lake");
    if (!(target.startsWith(`${lakeRoot}\\`) || target.startsWith(`${lakeRoot}/`))) throw new Error(`ETL_INVALID_ASSET_KEY: ${key}`);
    if (existsSync(target)) continue;
    mkdirSync(dirname(target), { recursive: true });
    const result = spawnSync(process.execPath, [wranglerBin, "r2", "object", "get", `${bucket}/${key}`, "--file", target, "--remote"], { stdio: "inherit" });
    if (result.status !== 0) {
      if (existsSync(target)) rmSync(target, { force: true });
      console.warn(JSON.stringify({ warning: "ETL_PROJECTION_NOT_IN_R2", key, message: "Proyección previa no disponible en R2; se regenerará." }));
    } else {
      downloaded += 1;
    }
  }
}

console.log(JSON.stringify({ snapshotReady: true, downloadedProjections: downloaded, requestedSources }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
