#!/usr/bin/env node
// CI gate S4: todo enlace con target="_blank" debe declarar rel con
// noopener o noreferrer (evita tabnabbing en enlaces externos).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["app", "components"];
const projectRoot = join(import.meta.dirname, "..");
const EXTENSIONS = new Set([".tsx", ".ts"]);

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

function enclosingTag(content, index) {
  const start = content.lastIndexOf("<a", index);
  const end = content.indexOf(">", index);
  if (start === -1 || end === -1) return null;
  return content.slice(start, end + 1);
}

const failures = [];
const files = [];
for (const root of ROOTS) collectFiles(join(projectRoot, root), files);

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const targetRe = /target=["']_blank["']/g;
  let match;
  while ((match = targetRe.exec(content)) !== null) {
    const tag = enclosingTag(content, match.index);
    if (!tag) {
      failures.push(`${file}: no se pudo delimitar la etiqueta <a> que contiene target="_blank"`);
      continue;
    }
    const relMatch = /\brel=["'][^"']*["']/.exec(tag);
    if (!relMatch || !/noopener|noreferrer/i.test(relMatch[0])) {
      const line = content.slice(0, match.index).split("\n").length;
      failures.push(`${file}:${line} <a target="_blank"> sin rel="noopener noreferrer"`);
    }
  }
}

if (failures.length > 0) {
  console.error(`[FAIL] ${failures.length} enlace(s) target="_blank" sin protección rel:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("[OK] Todos los target=\"_blank\" tienen rel noopener/noreferrer.");
