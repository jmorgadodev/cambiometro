import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = join(root, "out");
if (!existsSync(out)) throw new Error("out/ no existe; ejecuta pages:build");
const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path); else files.push(path);
  }
}
walk(out);
const relativeFiles = files.map((file) => relative(out, file).replaceAll("\\", "/"));
if (relativeFiles.some((file) => file.includes("server-functions") || file.includes("worker.js") || file.includes(".open-next"))) throw new Error("El export contiene artefactos OpenNext/runtime");
if (!relativeFiles.includes("_headers") || !relativeFiles.includes("_redirects")) throw new Error("Faltan _headers o _redirects en out/");
const html = relativeFiles.filter((file) => file.endsWith(".html"));
if (html.length === 0) throw new Error("out/ no contiene HTML");
// El export reúne una página HTML y su script inline por ruta canónica,
// además de índices paginados de los releases públicos. El explorador
// unificado de remuneraciones agrega índices válidos, por lo que el límite
// operativo debe dejar margen a ese crecimiento sin permitir una expansión
// accidental del catálogo.
if (files.length > 25_000) throw new Error(`Pages supera 25.000 archivos: ${files.length}`);
const oversized = files.filter((file) => statSync(file).size > 25 * 1024 * 1024);
if (oversized.length) throw new Error(`Assets sobre 25 MiB: ${oversized.map((file) => relative(out, file)).join(", ")}`);
const routes = ["index.html", "politico/index.html", "municipalidades/index.html", "servicios-publicos/index.html", "entidades/index.html", "transferencias/index.html", "gastos-operacionales/index.html"];
for (const route of routes) if (!relativeFiles.includes(route)) throw new Error(`Falta ruta estática: ${route}`);
const staticHeaders = readFileSync(join(out, "_headers"), "utf8");
if (/unsafe-inline|unsafe-eval/.test(staticHeaders)) throw new Error("CSP insegura en _headers");
const staticManifest = JSON.parse(readFileSync(join(out, "data", "static-site-manifest.json"), "utf8"));
const entityCatalog = JSON.parse(readFileSync(join(root, "data", "generated", "entity-catalog.json"), "utf8"));
if (staticManifest.datasets?.entities?.count !== entityCatalog.total) {
  throw new Error(`Universo de entidades incoherente: manifest=${staticManifest.datasets?.entities?.count} catalog=${entityCatalog.total}`);
}
const crossesManifestPath = join(out, "data", "cruces", "manifest.json");
if (!existsSync(crossesManifestPath)) throw new Error("Falta manifiesto estático de cruces");
const crossesManifest = JSON.parse(readFileSync(crossesManifestPath, "utf8"));
if (!Array.isArray(crossesManifest.pages) || crossesManifest.pages.length !== crossesManifest.totalPages) {
  throw new Error("Manifiesto de cruces incoherente: páginas declaradas");
}
let crossesRows = 0;
for (const page of crossesManifest.pages) {
  const pagePath = join(out, "data", "cruces", page);
  if (!existsSync(pagePath)) throw new Error(`Falta página estática de cruces: ${page}`);
  const rows = JSON.parse(readFileSync(pagePath, "utf8"));
  if (!Array.isArray(rows)) throw new Error(`Página estática de cruces inválida: ${page}`);
  crossesRows += rows.length;
}
if (crossesRows !== crossesManifest.totalRows) {
  throw new Error(`Universo de cruces incoherente: manifest=${crossesManifest.totalRows} páginas=${crossesRows}`);
}
if (crossesManifest.searchIndex) {
  const searchIndexPath = join(out, "data", "cruces", crossesManifest.searchIndex);
  if (!existsSync(searchIndexPath)) throw new Error("Falta índice de búsqueda de cruces");
  const searchRows = JSON.parse(readFileSync(searchIndexPath, "utf8"));
  if (!Array.isArray(searchRows) || searchRows.length !== crossesManifest.totalRows) {
    throw new Error(`Índice de búsqueda de cruces incoherente: manifest=${crossesManifest.totalRows} índice=${searchRows?.length ?? "inválido"}`);
  }
}
const bytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
console.log(JSON.stringify({ files: files.length, html: html.length, bytes, routes, crosses: { totalRows: crossesRows, totalPages: crossesManifest.totalPages } }));
