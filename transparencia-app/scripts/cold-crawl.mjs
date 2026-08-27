import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const baseUrl = (process.env.PROD_URL || "https://cambiometro.impulsacv.cl").replace(/\/$/, "");
const concurrency = Number(process.env.COLD_CRAWL_CONCURRENCY || 32);
const timeoutMs = Number(process.env.COLD_CRAWL_TIMEOUT_MS || 10000);
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
  const coldUrl = new URL(url);
  coldUrl.searchParams.set("__cold_crawl", `${Date.now()}-${index}`);
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
  return {
    route: new URL(url).pathname,
    status,
    ms,
    ok: status >= 200 && status < 400 && !bodyHas1102,
    bodyHas1102,
    error,
  };
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

const level12 = sitemapUrls.filter((url) => routeDepth(url) <= 2);
const results = await crawl(sitemapUrls);
const byStatus = Object.fromEntries([...new Set(results.map((result) => result.status))]
  .sort((a, b) => a - b)
  .map((status) => [status, results.filter((result) => result.status === status).length]));
const principalRoutes = ["/", "/politico", "/municipalidades", "/cruces", "/transferencias", "/funcionarios", "/entidades", "/datos", "/fuentes"];
const principal = results.filter((result) => principalRoutes.includes(result.route));
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  sitemapCount: sitemapUrls.length,
  level12Count: level12.length,
  concurrency,
  timeoutMs,
  total: results.length,
  ok: results.filter((result) => result.ok).length,
  failed: results.filter((result) => !result.ok).length,
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
  level12Count: report.level12Count,
  total: report.total,
  ok: report.ok,
  failed: report.failed,
  status: report.status,
  maxMs: report.maxMs,
  averageMs: report.averageMs,
  principal: report.principal,
}, null, 2));
if (report.failed > 0) process.exit(1);
