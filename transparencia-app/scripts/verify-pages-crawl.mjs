#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.env.PAGES_OUT ?? path.join(process.cwd(), "out"));
const baseUrl = process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:8788";
const concurrency = Math.max(1, Math.min(32, Number(process.env.CRAWL_CONCURRENCY ?? 16)));
const fullOutput = process.env.CRAWL_FULL_OUTPUT === "1";

async function walk(directory, result = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute, result);
    else result.push(absolute);
  }
  return result;
}

function routeFromHtml(file) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  if (!relative.endsWith("/index.html") && relative !== "index.html") return null;
  if (relative === "index.html") return "/";
  return `/${relative.slice(0, -"/index.html".length)}`;
}

async function sitemapRoutes() {
  try {
    const xml = await readFile(path.join(root, "sitemap.xml"), "utf8");
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
  } catch {
    return [];
  }
}

const files = await walk(root);
const htmlRoutes = files.map(routeFromHtml).filter((route) => route && route !== "/_not-found");
const routes = [...new Set([...htmlRoutes, ...(await sitemapRoutes())])].sort();
if (routes.length === 0) throw new Error(`PAGES_CRAWL_NO_ROUTES: ${root}`);

const results = [];
let cursor = 0;
async function worker() {
  while (cursor < routes.length) {
    const index = cursor;
    cursor += 1;
    const route = routes[index];
    const startedAt = performance.now();
    let status = 0;
    let error = null;
    try {
      const response = await fetch(`${baseUrl}${route}`, {
        headers: { "User-Agent": "Cambiometro-Pages-Crawler/1.0", "Cache-Control": "no-cache" },
        redirect: "manual",
        signal: AbortSignal.timeout(15_000),
      });
      status = response.status;
      const body = await response.text();
      if (/(?:Cloudflare|Error)\s*(?:code\s*[:#]?\s*)?1102|Worker threw exception|Internal Server Error/i.test(body)) error = "error-page-body";
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
    results[index] = { route, status, ms: Math.round(performance.now() - startedAt), error };
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, routes.length) }, () => worker()));
const failures = results.filter((result) => result.status !== 200 || result.error);
const slow = results.filter((result) => result.ms >= 700);
const levelOne = new Set([
  "/", "/politico", "/partidos", "/servicios-publicos", "/municipalidades",
  "/transferencias", "/cruces", "/movimientos", "/datos", "/fuentes",
  "/rankings", "/comparar", "/donar", "/como-funciona", "/privacidad",
  "/calculadora", "/cambios", "/personas", "/funcionarios", "/autoridades",
]);
const slowLevelOne = results.filter((result) => levelOne.has(result.route) && result.ms >= 700);

if (fullOutput) {
  for (const result of results) console.log(`${result.route}\t${result.status}\t${result.ms}ms${result.error ? `\t${result.error}` : ""}`);
}

const report = {
  ok: failures.length === 0 && slowLevelOne.length === 0,
  baseUrl,
  routes: routes.length,
  concurrency,
  failures: failures.slice(0, 50),
  failureCount: failures.length,
  slowCount: slow.length,
  slowLevelOne,
  maxMs: Math.max(...results.map((result) => result.ms)),
  p95Ms: results.sort((left, right) => left.ms - right.ms)[Math.floor(results.length * 0.95)]?.ms ?? 0,
};
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
