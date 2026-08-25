#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .map((file) => file.replaceAll("\\", "/"));

const generatedPrefixes = [
  "transparencia-app/out/",
  "transparencia-app/.pages-static/",
  "transparencia-app/public/data/funcionarios/",
  "transparencia-app/public/data/transferencias/",
  "transparencia-app/public/data/politico-slices/",
  "transparencia-app/workers/public-api/.dist/",
  "transparencia-app/workers/public-api/.wrangler/",
  "transparencia-app/data/lake/partitions/",
  "transparencia-app/data/lake/projections/funcionarios-v1/",
  "transparencia-app/data/lake-cplt/",
  "transparencia-app/data/cplt-category/",
  "transparencia-app/data/cplt-artifacts/",
];
const generatedPatterns = [
  /^docs\/auditoria\/.*\.json$/,
];

const violations = tracked.filter((file) =>
  generatedPrefixes.some((prefix) => file.startsWith(prefix))
  || generatedPatterns.some((pattern) => pattern.test(file))
);
if (violations.length > 0) {
  console.error(JSON.stringify({ ok: false, violations }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, trackedFiles: tracked.length, generatedPrefixes, generatedPatterns: generatedPatterns.map(String) }, null, 2));
