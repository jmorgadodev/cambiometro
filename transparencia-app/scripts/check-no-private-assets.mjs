#!/usr/bin/env node
/**
 * Guardia G3: bloquea referencias a activos privados en el repositorio publico.
 *
 * Alcance: app/ components/ lib/ scripts/ workers/ docs/ fixtures/
 * Exclusiones: data/ public/ .github/ migrations/ node_modules/ .next/ y este script.
 * Patrones (case-insensitive): social/ backups/ clientes/ deck Bearer
 * Allowlist por archivo+termino para casos legitimos documentados.
 *
 * Exit 0 si no hay violaciones; exit 1 listando archivos y lineas si las hay.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCOPES = ["app", "components", "lib", "scripts", "workers", "docs", "fixtures"];
const EXCLUDED_DIRS = new Set(["data", "public", ".github", "migrations", "node_modules", ".next"]);
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".md", ".html", ".txt", ".css", ".csv"]);

const PATTERNS = [
  /\bsocial\//i,
  /\bbackups\//i,
  /\bclientes\//i,
  /\bdeck/i,
  /\bBearer\b/i,
];

const ALLOWLIST = {
  ".github/workflows/usage-watch.yml": ["bearer"], // Authorization: Bearer $GH_TOKEN
  "scripts/backup-weekly.mjs": ["bearer"], // Authorization: Bearer $CLOUDFLARE_API_TOKEN (R2 API)
  "scripts/restore-drill.mjs": ["bearer"], // Authorization: Bearer $CLOUDFLARE_API_TOKEN (R2 API)
  "scripts/verify-lake-manifests.mjs": ["bearer"], // allow if uses Bearer for R2
  "scripts/pages-rollback.mjs": ["bearer"], // Authorization: Bearer $CLOUDFLARE_API_TOKEN (Pages API)
  "lib/pages-rollback.test.ts": ["bearer"], // regression for the Pages API authorization header
};

const SELF = new Set(["check-no-ai-traces.mjs", "check-no-private-assets.mjs"]);

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name) || SELF.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function collectFiles() {
  const files = [];
  for (const scope of SCOPES) {
    const dir = join(ROOT, scope);
    if (statSync(dir, { throwIfNoEntry: false })?.isDirectory()) files.push(...walk(dir));
  }
  return files;
}

const violations = [];

for (const file of collectFiles()) {
  const ext = file.slice(file.lastIndexOf("."));
  if (!TEXT_EXTENSIONS.has(ext)) continue;
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of PATTERNS) {
      const match = pattern.exec(lines[i]);
      if (!match) continue;
      const allowed = (ALLOWLIST[rel] ?? []).includes(match[0].toLowerCase());
      if (!allowed) violations.push(`${rel}:${i + 1}: match "${match[0]}" (${pattern})`);
    }
  }
}

if (violations.length > 0) {
  console.error("Violaciones detectadas (referencias a activos privados):");
  for (const v of [...new Set(violations)]) console.error(`  - ${v}`);
  console.error(`${violations.length} violaciones en ${new Set(violations.map((v) => v.split(":")[0])).size} archivos.`);
  process.exit(1);
}

console.log("OK: sin referencias a activos privados.");
