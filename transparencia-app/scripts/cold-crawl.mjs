import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const baseUrl = (process.env.PROD_URL || "https://cambiometro.impulsacv.cl").replace(/\/$/, "");
const concurrency = Number(process.env.COLD_CRAWL_CONCURRENCY || 32);
const timeoutMs = Number(process.env.COLD_CRAWL_TIMEOUT_MS || 10000);
const maxRetries = Number(process.env.COLD_CRAWL_RETRIES || 2);
const retryDelayMs = Number(process.env.COLD_CRAWL_RETRY_DELAY_MS || 500);
const outputPath = resolve(process.env.COLD_CRAWL_OUTPUT || "artifacts/cold-crawl-latest.json");
const uptimeToken = process.env.UPTIME_TOKEN?.trim() || "";

function requestHeaders() {
  return {
    "User-Agent": "Cambiometro-Cold-Crawl/1.0",
    "Cache-Control": "no-cache, no-store",
    Pragma: "no-cache",
    ...(uptimeToken ? { "X-Cambiometro-Uptime-Token": uptimeToken } : {}),
  };
}

function parseSitemap(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((match) => match[1].trim())
    .map((url) => {
      const parsed = new URL(url);
      return `${baseUrl}${parsed.pathname}${parsed.search}`;
    });
}

function routeDepth(url) {
  const pathname = new URL(url).pathname.replace(/^\/+|\/+$/g, "");
  return pathname ? pathname.split("/").length : 0;
}

async function checkUrl(url, index) {
  const route = new URL(url).pathname;
  let initialStatus = null;
  let initialError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const coldUrl = new URL(url);
    coldUrl.searchParams.set("__cold_crawl", `${Date.now()}-${index}-${attempt}`);
    const started = performance.now();
    let response = null;
    let error = null;
    let body = "";
    try {
      response = await fetch(coldUrl, {
        headers: requestHeaders(),
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });
      body = await response.text();
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    }
    const ms = Math.round(performance.now() - started);
    const status = response?.status ?? 0;
    const bodyHas1102 = /(?:error code:\s*1102|error\s+1102|worker threw exception)/i.test(body);
    const ok = status >= 200 && status < 400 && !bodyHas1102;
    if (initialStatus === null) initialStatus = status;
    if (initialError === null && error) initialError = error;

    const retryable = status === 0 || status >= 500 || bodyHas1102;
    if (ok || !retryable || attempt === maxRetries) {
      return {
        route,
        status,
        ms,
        ok,
        bodyHas1102,
        error,
        attempts: attempt + 1,
        retries: attempt,
        initialStatus,
        initialError,
      };
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, retryDelayMs * (2 ** attempt)));
  }

  throw new Error(`No se pudo completar el crawl de ${route}`);
}

async function crawl(urls) {
  const results = [];
  for (let start = 0; start < urls.length; start += concurrency) {
    const batch = urls.slice(start, start + concurrency);
    results.push(...await Promise.all(batch.map((url, offset) => checkUrl(url, start + offset))));
  }
  return results;
}

const sitemapResponse = await fetch(`${baseUrl}/sitemap.xml`, {
  headers: requestHeaders(),
  signal: AbortSignal.timeout(timeoutMs),
});
if (!sitemapResponse.ok) throw new Error(`SITEMAP_HTTP_${sitemapResponse.status}`);
const sitemapUrls = parseSitemap(await sitemapResponse.text());
if (sitemapUrls.length === 0) throw new Error("SITEMAP_EMPTY");

const principalRoutes = [
  "/",
  "/autoridades/",
  "/cambios/",
  "/calculadora/",
  "/comparar/",
  "/cruces/",
  "/datos/",
  "/donar/",
  "/entidades/",
  "/fuentes/",
  "/funcionarios/",
  "/gastos-operacionales/",
  "/movimientos/",
  "/municipalidades/",
  "/partidos/",
  "/personas/",
  "/politico/",
  "/privacidad/",
  "/rankings/",
  "/servicios-publicos/",
  "/transferencias/",
  "/votaciones-destacadas/",
  "/como-funciona/",
];
const crawlUrls = [...new Set([
  ...sitemapUrls,
  ...principalRoutes.map((route) => `${baseUrl}${route}`),
])];
const level12 = crawlUrls.filter((url) => routeDepth(url) <= 2);
const results = await crawl(crawlUrls);
const byStatus = Object.fromEntries([...new Set(results.map((result) => result.status))]
  .sort((a, b) => a - b)
  .map((status) => [status, results.filter((result) => result.status === status).length]));
const principal = results.filter((result) => principalRoutes.includes(result.route));
const principalByRoute = new Map(principal.map((result) => [result.route, result]));
const missingPrincipal = principalRoutes.filter((route) => !principalByRoute.has(route));
if (missingPrincipal.length > 0) throw new Error(`PRINCIPAL_ROUTES_MISSING:${missingPrincipal.join(",")}`);
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  sitemapCount: sitemapUrls.length,
  requestedCount: crawlUrls.length,
  level12Count: level12.length,
  concurrency,
  timeoutMs,
  maxRetries,
  retryDelayMs,
  total: results.length,
  ok: results.filter((result) => result.ok).length,
  failed: results.filter((result) => !result.ok).length,
  recovered: results.filter((result) => result.ok && result.retries > 0).length,
  status: byStatus,
  maxMs: Math.max(...results.map((result) => result.ms)),
  averageMs: Math.round(results.reduce((sum, result) => sum + result.ms, 0) / results.length),
  principal,
  results,
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  output: outputPath,
  sitemapCount: report.sitemapCount,
  requestedCount: report.requestedCount,
  level12Count: report.level12Count,
  total: report.total,
  ok: report.ok,
  failed: report.failed,
  recovered: report.recovered,
  status: report.status,
  maxMs: report.maxMs,
  averageMs: report.averageMs,
  principal: report.principal,
}, null, 2));
if (report.failed > 0) process.exit(1);
