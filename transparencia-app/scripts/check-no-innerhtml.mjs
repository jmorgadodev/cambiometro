#!/usr/bin/env node
// CI gate S4: prohíbe inyección de HTML/eval con contenido externo en el
// cliente. Única excepción: JSON-LD con JSON.stringify y escapo de "<",
// porque nunca ejecuta HTML (script type=application/ld+json).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["app", "components"];
const projectRoot = join(import.meta.dirname, "..");
const EXTENSIONS = new Set([".tsx", ".ts"]);

const DANGEROUS = [
  { pattern: /\.innerHTML\s*=/, label: "innerHTML assignment" },
  { pattern: /dangerouslySetInnerHTML/g, label: "dangerouslySetInnerHTML" },
  { pattern: /document\.write\(/g, label: "document.write" },
  { pattern: /\beval\(/g, label: "eval(" },
];

// script type="application/ld+json" con JSON.stringify y "<" escapado: seguro.
const SAFE_JSONLD = /type=["']application\/ld\+json["'][^>]*dangerouslySetInnerHTML=\{\{\s*__html:\s*JSON\.stringify\([^)]*\)\.replace\(\/<\/g,\s*["']\\\\u003c["']\)\s*\}\}/;

function isSafeJsonLd(content, start) {
  const window = content.slice(Math.max(0, start - 160), start + 300);
  return SAFE_JSONLD.test(window);
}

function collectFiles(dir, out) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectFiles(full, out);
    } else if (EXTENSIONS.has(entry.slice(entry.lastIndexOf(".")))) {
      out.push(full);
    }
  }
}

const failures = [];
const files = [];
for (const root of ROOTS) collectFiles(join(projectRoot, root), files);

for (const file of files) {
  const content = readFileSync(file, "utf8");
  for (const { pattern, label } of DANGEROUS) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (label === "dangerouslySetInnerHTML" && isSafeJsonLd(content, match.index)) continue;
      const line = content.slice(0, match.index).split("\n").length;
      failures.push(`${file}:${line} ${label}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`[FAIL] Prácticas de inyección HTML/eval encontradas:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("[OK] Sin innerHTML/dangerouslySetInnerHTML (no JSON-LD)/document.write/eval en app/ y components/.");
