#!/usr/bin/env node

/**
 * Checks links emitted by the static export against the actual Pages artifact.
 * This catches a common migration regression: an internal link still points to
 * a legacy ID whose HTML was replaced by a canonical slug.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve("out");
const redirectsPath = join(root, "_redirects");
const redirectSources = new Set(
  (existsSync(redirectsPath) ? readFileSync(redirectsPath, "utf8") : "")
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean),
);

function listHtml(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listHtml(absolute));
    else if (entry.name.endsWith(".html")) files.push(absolute);
  }
  return files;
}

function assetExists(pathname) {
  const clean = pathname.replace(/^\/+/, "");
  const direct = join(root, clean);
  if (existsSync(direct) && statSync(direct).isFile()) return true;
  if (existsSync(join(root, clean, "index.html"))) return true;
  if (existsSync(join(root, `${clean}.html`))) return true;
  return false;
}

const checked = new Set();
const failures = [];
for (const htmlPath of listHtml(root)) {
  const html = readFileSync(htmlPath, "utf8");
  for (const match of html.matchAll(/\bhref\s*=\s*["'](\/[^"'#?]*)[^"']*["']/gi)) {
    const pathname = match[1];
    if (pathname === "//" || pathname.startsWith("/api/")) continue;
    if (checked.has(pathname)) continue;
    checked.add(pathname);
    if (!assetExists(pathname) && !redirectSources.has(pathname)) {
      failures.push({ source: `/${relative(root, htmlPath).replaceAll("\\", "/")}`, href: pathname });
    }
  }
}

const result = {
  ok: failures.length === 0,
  htmlFiles: listHtml(root).length,
  uniqueInternalLinks: checked.size,
  redirectSources: redirectSources.size,
  failures: failures.slice(0, 50),
};
console.log(JSON.stringify(result, null, 2));
if (failures.length > 0) process.exitCode = 1;
