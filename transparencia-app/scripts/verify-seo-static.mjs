import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = join(root, "out");
const baseUrl = "https://cambiometro.impulsacv.cl";

if (!existsSync(out)) throw new Error("SEO_STATIC_OUT_MISSING: ejecuta pages:build primero");

const normalizeRoute = (value) => {
  const path = value.split("?")[0].split("#")[0];
  return path.length > 1 ? path.replace(/\/+$/, "") : "/";
};

const redirectSources = new Set();
const redirects = readFileSync(join(out, "_redirects"), "utf8");
for (const line of redirects.split(/\r?\n/)) {
  const fields = line.trim().split(/\s+/);
  if (fields.length < 3 || fields[2] !== "301" || fields[0].startsWith("#")) continue;
  if (normalizeRoute(fields[0]) !== normalizeRoute(fields[1])) redirectSources.add(normalizeRoute(fields[0]));
}

const htmlFiles = [];
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name === "index.html") htmlFiles.push(path);
  }
}
walk(out);

const expected = [];
for (const file of htmlFiles) {
  const routePart = relative(out, file).replaceAll("\\", "/").replace(/(^|\/)index\.html$/, "");
  const route = routePart ? "/" + routePart : "/";
  if (route === "/404" || route === "/_not-found" || redirectSources.has(normalizeRoute(route))) continue;
  const html = readFileSync(file, "utf8");
  const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1] ?? "";
  const expectedCanonical = route === "/" ? baseUrl + "/" : baseUrl + route + "/";
  if (canonical !== expectedCanonical) throw new Error("SEO_CANONICAL_MISMATCH: " + route + " => " + (canonical || "(missing)") + "; expected " + expectedCanonical);
  if (!/<title>[^<]+<\/title>/i.test(html)) throw new Error("SEO_TITLE_MISSING: " + route);
  if (!/<meta[^>]+name="description"[^>]+content="[^"]+"/i.test(html)) throw new Error("SEO_DESCRIPTION_MISSING: " + route);
  if (/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html)) throw new Error("SEO_NOINDEX_UNEXPECTED: " + route);
  expected.push(expectedCanonical);
}

const sitemap = readFileSync(join(out, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (sitemapUrls.length !== expected.length) throw new Error("SEO_SITEMAP_COUNT_MISMATCH: sitemap=" + sitemapUrls.length + " expected=" + expected.length);
for (const canonical of expected) if (!sitemapUrls.includes(canonical)) throw new Error("SEO_SITEMAP_MISSING_CANONICAL: " + canonical);

const robots = readFileSync(join(out, "robots.txt"), "utf8");
if (!robots.includes("Sitemap: " + baseUrl + "/sitemap.xml")) throw new Error("SEO_ROBOTS_SITEMAP_MISSING");
if (!robots.includes("Disallow: /api/")) throw new Error("SEO_ROBOTS_API_GUARD_MISSING");

console.log("Static SEO guard passed: " + expected.length + " canonical HTML routes, " + sitemapUrls.length + " sitemap URLs.");
