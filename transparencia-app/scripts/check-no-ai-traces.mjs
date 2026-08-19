#!/usr/bin/env node
/**
 * Guardia G2: bloquea trazas de asistentes de IA en el repositorio público.
 *
 * Alcance: app/ components/ lib/ scripts/ workers/ docs/ fixtures/
 * Exclusiones: data/ public/ .github/ migrations/ node_modules/ .next/ y este script.
 * Patrones (case-insensitive, con limites de palabra):
 *   codex, antigravity, claude, gpt, vibe, "as an ai", brief-
 * Emojis: solo se bloquean en comentarios de codigo; los strings de UI son validos.
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
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"]);
const TEXT_EXTENSIONS = new Set([".json", ".md", ".html", ".txt", ".csv"]);

const PATTERNS = [
  /\bcodex\b/i,
  /\bantigravity\b/i,
  /\bclaude\b/i,
  /\bgpt\b/i,
  /\bvibe\b/i,
  /\bas an ai\b/i,
  /\bbrief-/i,
];

const ALLOWLIST = {
  "lib/servicios-publicos.ts": ["claude"], // Jorge Claude, nombre real de EFE
  "app/robots.ts": ["gpt", "claude"], // GPTBot / ClaudeBot en robots.txt
  "scripts/etl/sinim.mjs": ["codex"], // decodeXml
  "data/lake/projections/muni-maipu.json": ["gpt"], // cargo "Copiloto" (dato publico)
};

const EMOJI_REGEX = /[\u{1F000}-\u{1FAFF}\u{1F300}-\u{1F5FF}\u{2600}-\u{27BF}\u{FE0F}]/u;

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

function isCommentLine(line, inBlock) {
  const trimmed = line.trimStart();
  if (inBlock) return true;
  return trimmed.startsWith("//") || trimmed.startsWith("/*");
}

function findCommentEmoji(content, rel) {
  const violations = [];
  const lines = content.split(/\r?\n/);
  let inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    if (inBlock) {
      if (EMOJI_REGEX.test(line)) violations.push(`${rel}:${i + 1}: emoji en comentario`);
      if (trimmed.includes("*/")) inBlock = false;
      continue;
    }
    if (trimmed.startsWith("/*") && !trimmed.includes("*/")) inBlock = true;
    if (isCommentLine(line, false) && EMOJI_REGEX.test(line)) {
      violations.push(`${rel}:${i + 1}: emoji en comentario`);
    }
  }
  return violations;
}

const violations = [];

for (const file of collectFiles()) {
  const ext = file.slice(file.lastIndexOf("."));
  if (!CODE_EXTENSIONS.has(ext) && !TEXT_EXTENSIONS.has(ext)) continue;
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
  if (CODE_EXTENSIONS.has(ext)) violations.push(...findCommentEmoji(content, rel));
}

if (violations.length > 0) {
  console.error("Violaciones detectadas (trazas de IA o emojis en comentarios):");
  for (const v of [...new Set(violations)]) console.error(`  - ${v}`);
  console.error(`${violations.length} violaciones en ${new Set(violations.map((v) => v.split(":")[0])).size} archivos.`);
  process.exit(1);
}

console.log("OK: sin trazas de IA ni emojis en comentarios.");