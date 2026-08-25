#!/usr/bin/env node

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootArg = process.argv.find((argument) => argument.startsWith("--root="));
if (!rootArg) throw new Error("STATIC_CSP_OUTPUT_ROOT_REQUIRED");
const root = path.resolve(rootArg.slice("--root=".length));
const nonce = "cambiometro-static-v1";
const allowedInlineStyles = new Set(["color:transparent", "display:inline-block;vertical-align:middle;flex-shrink:0"]);
const rules = new Map();

async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(file));
    else if (entry.name.endsWith(".html")) files.push(file);
  }
  return files;
}

function decodeHtml(value) {
  return value.replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
}

function collectRules(tag) {
  const classValue = tag.match(/\bclass="([^"]*)"/i)?.[1] ?? "";
  const declarations = decodeHtml(tag.match(/\bdata-csp-style="([^"]*)"/i)?.[1] ?? "");
  if (!declarations) return;
  for (const className of classValue.split(/\s+/).filter((value) => /^csp-[a-z0-9]+$/.test(value))) {
    rules.set(className, declarations);
  }
}

const files = await htmlFiles(root);
for (const file of files) {
  let html = await readFile(file, "utf8");
  for (const match of html.matchAll(/<([a-z][^>]*\bdata-csp-style="[^"]*"[^>]*)>/gi)) collectRules(match[0]);
  html = html.replace(/<script(?![^>]*\bnonce=)([^>]*)>/gi, `<script nonce="${nonce}"$1>`);
  html = html.replace(/<style(?![^>]*\bnonce=)([^>]*)>/gi, `<style nonce="${nonce}"$1>`);
  for (const match of html.matchAll(/\sstyle="([^"]*)"/gi)) {
    const value = decodeHtml(match[1]);
    if (!allowedInlineStyles.has(value)) throw new Error(`STATIC_CSP_INLINE_STYLE_ATTRIBUTE: ${path.relative(root, file)}: ${value}`);
  }
  if (!html.includes('data-csp-inline-styles="true"')) {
    const link = '<link rel="stylesheet" href="/_next/static/css/csp-inline-styles.css" data-csp-inline-styles="true" />';
    html = html.includes("</head>") ? html.replace("</head>", `${link}</head>`) : `${link}${html}`;
  }
  await writeFile(file, html, "utf8");
}

const css = [...rules.entries()]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([className, declarations]) => `.${className}{${declarations}}`)
  .join("\n");
const cssPath = path.join(root, "_next", "static", "css", "csp-inline-styles.css");
await mkdir(path.dirname(cssPath), { recursive: true });
await writeFile(cssPath, `${css}\n`, "utf8");
console.log(`[static-csp] HTML procesado: ${files.length}; reglas CSS: ${rules.size}; CSS: ${path.relative(root, cssPath)}`);
