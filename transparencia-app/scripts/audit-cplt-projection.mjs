import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { auditCpltProjection } from "./etl/cplt-projection-quality.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function readJson(file) {
  return JSON.parse(readFileSync(resolve(file), "utf8"));
}

function main() {
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
