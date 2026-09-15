import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { reconcileCpltScopes } from "./etl/connectors/cplt-scope-reconciliation.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function options(name) {
  const values = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1]) values.push(process.argv[index + 1]);
  }
  return values;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(resolve(filePath), "utf8"));
}

function parseCategoryRoot(spec) {
  const separator = spec.indexOf("=");
  if (separator < 1 || separator === spec.length - 1) throw new Error(`CPLT_CATEGORY_ROOT_INVALID:${spec}`);
  const category = spec.slice(0, separator).trim();
  const root = resolve(spec.slice(separator + 1).trim());
  const validationPath = resolve(root, "validation.json");
  const organizationsPath = resolve(root, "organizations.json");
  if (!existsSync(validationPath) || !existsSync(organizationsPath)) throw new Error(`CPLT_CATEGORY_ARTIFACT_MISSING:${category}`);
  const validation = readJson(validationPath);
  const organizations = readJson(organizationsPath);
  return {
    category,
    recordCount: validation.recordCount,
    checksumSha256: validation.checksumSha256 ?? null,
    generatedAt: validation.generatedAt ?? null,
    sourceId: validation.sourceId ?? null,
    organizations: Array.isArray(organizations.organizations) ? organizations.organizations : [],
  };
}

export function auditCentralScope({ publicManifest, categoryRoots }) {
  return reconcileCpltScopes({ publicManifest, candidateCategories: categoryRoots });
}

function main() {
  const manifestPath = option("--public-manifest");
  const categorySpecs = options("--category-root");
  if (!manifestPath || categorySpecs.length === 0) {
    console.error("Uso: node scripts/audit-cplt-central-scope.mjs --public-manifest <manifest.json> --category-root <categoria=ruta> [--category-root ...] [--fail-on-block]");
    process.exitCode = 2;
    return;
  }
  const result = auditCentralScope({ publicManifest: readJson(manifestPath), categoryRoots: categorySpecs.map(parseCategoryRoot) });
  console.log(JSON.stringify({ publicManifestPath: resolve(manifestPath), ...result }, null, 2));
  if (process.argv.includes("--fail-on-block") && !result.replacementEligible) process.exitCode = 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
