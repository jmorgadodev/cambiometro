import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { auditCpltProjection } from "./etl/cplt-projection-quality.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function readJson(file) {
  return JSON.parse(readFileSync(resolve(file), "utf8"));
}

function downloadRemoteJson(bucket, key, file) {
  const wrangler = resolve(import.meta.dirname, "../node_modules/wrangler/bin/wrangler.js");
  const result = spawnSync(process.execPath, [wrangler, "r2", "object", "get", `${bucket}/${key}`, "--file", file, "--remote"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`R2_PROJECTION_READ_FAILED:${key}:${result.stderr?.trim() ?? result.status}`);
  }
  return readJson(file);
}

function runRemoteAudit() {
  const bucket = option("--bucket") ?? "transparencia-public-data";
  const variant = option("--variant") ?? "funcionarios-v1";
  const temporary = mkdtempSync(join(tmpdir(), "cambiometro-cplt-projection-audit-"));
  try {
    const manifestKey = `projections/${variant}/manifest.json`;
    const manifestPath = join(temporary, "manifest.json");
    const manifest = downloadRemoteJson(bucket, manifestKey, manifestPath);
    const indexKey = manifest?.searchIndex?.key;
    if (!indexKey) throw new Error(`R2_PROJECTION_SEARCH_INDEX_MISSING:${variant}`);
    const indexPath = join(temporary, "search-index.json");
    const index = downloadRemoteJson(bucket, indexKey, indexPath);
    // Algunos releases antiguos no publican transparency-summary.json. En ese
    // caso se audita como metadata incompleta; nunca se inventan períodos.
    const summaryPath = option("--summary");
    const summary = summaryPath ? readJson(summaryPath) : {};
    return {
      manifestPath: manifestKey,
      indexPath: indexKey,
      summaryPath: summaryPath ?? null,
      bucket,
      variant,
      ...auditCpltProjection({ manifest, index, summary }),
    };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

function main() {
  if (hasFlag("--remote-r2")) {
    const result = runRemoteAudit();
    console.log(JSON.stringify(result, null, 2));
    if (hasFlag("--fail-on-block") && !result.promotionAllowed) process.exitCode = 2;
    return;
  }
  const manifestPath = option("--manifest");
  const indexPath = option("--index");
  const summaryPath = option("--summary");
  if (!manifestPath || !indexPath || !summaryPath) {
    console.error("Uso: node scripts/audit-cplt-projection.mjs --manifest <manifest.json> --index <search_index.json> --summary <transparency-summary.json> [--fail-on-block]");
    process.exitCode = 2;
    return;
  }
  const result = auditCpltProjection({ manifest: readJson(manifestPath), index: readJson(indexPath), summary: readJson(summaryPath) });
  console.log(JSON.stringify({ manifestPath: resolve(manifestPath), indexPath: resolve(indexPath), summaryPath: resolve(summaryPath), ...result }, null, 2));
  if (process.argv.includes("--fail-on-block") && !result.promotionAllowed) process.exitCode = 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
