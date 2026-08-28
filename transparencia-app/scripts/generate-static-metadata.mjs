import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const outDir = join(projectRoot, "out");
const baseUrl = "https://cambiometro.impulsacv.cl";

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await collectHtml(absolute));
    else if (entry.name === "index.html") {
      const path = relative(outDir, absolute).replace(/\\/g, "/").replace(/(^|\/)index\.html$/, "");
      if (!path.startsWith("api/") && path !== "404" && path !== "_not-found") paths.push(path ? `/${path}` : "/");
    }
  }
  return paths;
}

function normalizeRoute(value) {
  const withoutQuery = value.split("?")[0].split("#")[0];
  return withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, "") : "/";
}

// Next export also emits HTML placeholders for legacy aliases. Pages applies
// `_redirects`, but those aliases must not be advertised as indexable URLs.
// Keep canonical-slash redirects (same normalized route) in the sitemap.
const redirectSources = new Set();
const redirectsPath = join(outDir, "_redirects");
const redirects = await readFile(redirectsPath, "utf8").catch(() => "");
for (const line of redirects.split(/\r?\n/)) {
  const fields = line.trim().split(/\s+/);
  if (fields.length < 3 || fields[2] !== "301" || fields[0].startsWith("#")) continue;
  if (normalizeRoute(fields[0]) !== normalizeRoute(fields[1])) redirectSources.add(normalizeRoute(fields[0]));
}

const routes = (await collectHtml(outDir))
  .filter((route) => !redirectSources.has(normalizeRoute(route)))
  .sort();
// `lastmod` is optional. Do not claim that every URL changed on every build;
// stale timestamps make the sitemap less trustworthy for crawlers.
const urlset = routes
  .map((route) => "<url><loc>" + (route === "/" ? baseUrl + "/" : baseUrl + route + "/") + "</loc></url>")
  .join("");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlset}</urlset>\n`;
await mkdir(join(outDir, "_meta"), { recursive: true });
await writeFile(join(outDir, "sitemap.xml"), sitemap);
const robots = `User-agent: *\nAllow: /\nAllow: /api/og/\nDisallow: /api/\nDisallow: /_next/\n\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /\n\nUser-agent: CCBot\nDisallow: /\n\nUser-agent: Google-Extended\nDisallow: /\n\nSitemap: ${baseUrl}/sitemap.xml\nHost: ${baseUrl}\n`;
await writeFile(join(outDir, "robots.txt"), robots);
console.log(`Generated static metadata for ${routes.length} canonical routes; excluded ${redirectSources.size} redirect aliases.`);
