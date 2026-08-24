import { mkdir, readdir, writeFile } from "node:fs/promises";
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
      const path = relative(outDir, absolute).replace(/\\/g, "/").replace(/\/index\.html$/, "");
      if (!path.startsWith("api/") && path !== "404") paths.push(path ? `/${path}` : "/");
    }
  }
  return paths;
}

const routes = (await collectHtml(outDir)).sort();
const lastModified = new Date().toISOString();
const urlset = routes.map((route) => `<url><loc>${baseUrl}${route === "/" ? "" : route}</loc><lastmod>${lastModified}</lastmod></url>`).join("");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlset}</urlset>\n`;
await mkdir(join(outDir, "_meta"), { recursive: true });
await writeFile(join(outDir, "sitemap.xml"), sitemap);
await writeFile(join(outDir, "robots.txt"), `User-agent: *\nAllow: /\nAllow: /api/og/\nDisallow: /api/\nDisallow: /_next/\n\nUser-agent: GPTBot\nDisallow: /\n\nSitemap: ${baseUrl}/sitemap.xml\nHost: ${baseUrl}\n`);
console.log(`Generated static metadata for ${routes.length} routes.`);
