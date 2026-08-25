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
if (files.length > 20_000) throw new Error(`Pages supera 20.000 archivos: ${files.length}`);
const oversized = files.filter((file) => statSync(file).size > 25 * 1024 * 1024);
if (oversized.length) throw new Error(`Assets sobre 25 MiB: ${oversized.map((file) => relative(out, file)).join(", ")}`);
const routes = ["index.html", "politico/index.html", "municipalidades/index.html", "servicios-publicos/index.html", "entidades/index.html", "transferencias/index.html"];
for (const route of routes) if (!relativeFiles.includes(route)) throw new Error(`Falta ruta estática: ${route}`);
const staticHeaders = readFileSync(join(out, "_headers"), "utf8");
const headerLines = staticHeaders.split(/\r?\n/);
const headerRules = headerLines.filter((line) => line.trim() && !/^[ \t]/.test(line));
const oversizedHeaderLines = headerLines.filter((line) => line.length > 2_000);
if (headerRules.length > 100) throw new Error(`Pages admite como máximo 100 reglas _headers; se encontraron ${headerRules.length}`);
if (oversizedHeaderLines.length > 0) throw new Error(`Una línea de _headers supera 2.000 caracteres: ${oversizedHeaderLines[0].length}`);
if (!headerLines.some((line) => /^\s+Content-Security-Policy:/.test(line))) throw new Error("out/_headers no publica Content-Security-Policy");
if (/unsafe-inline|unsafe-eval/.test(staticHeaders)) throw new Error("CSP insegura en _headers");
const bytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
console.log(JSON.stringify({ files: files.length, html: html.length, bytes, routes }));
