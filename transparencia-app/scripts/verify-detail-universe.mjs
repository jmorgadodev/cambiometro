import { readFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = join(root, "out");

if (!existsSync(out)) throw new Error("DETAIL_UNIVERSE_OUT_MISSING: ejecuta pages:build");

const readJson = (relativePath) => readFile(join(root, relativePath), "utf8").then(JSON.parse);
const readHtml = (relativePath) => readFile(join(out, relativePath), "utf8");
const slugify = (value) => String(value)
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9\s-]/g, "")
  .trim()
  .replace(/\s+/g, "-")
  .replace(/-+/g, "-");

function detailFiles(segment) {
  const directory = join(out, segment);
  return new Set(readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(directory, entry.name, "index.html")))
    .map((entry) => entry.name));
}

function assertHtmlIsUsable(html, expectedName, label) {
  const forbidden = [
    "This page couldn't load",
    "Application error",
    "Político no encontrado",
    "Municipalidad No Encontrada",
  ];
  const foundForbidden = forbidden.filter((marker) => html.includes(marker));
  if (foundForbidden.length > 0) throw new Error(`DETAIL_HTML_INVALID: ${label}: ${foundForbidden.join(", ")}`);
  if (!html.includes(expectedName)) throw new Error(`DETAIL_NAME_MISSING: ${label}: ${expectedName}`);
  if (!/<h1[\s>]/i.test(html)) throw new Error(`DETAIL_H1_MISSING: ${label}`);
}

const politicianIndex = await readJson("data/politicos-votaciones-index.json");
const municipalities = await readJson("data/municipalidades-list.json");
const politicianEntries = Object.values(politicianIndex ?? {});
const politicianSlugs = politicianEntries.map((entry) => entry.slug || slugify(entry.nombre));
const municipalityEntries = municipalities.map((entry) => ({
  ...entry,
  slug: slugify(entry.nombre_comuna),
}));

if (politicianEntries.length !== 205) throw new Error(`DETAIL_POLITICO_UNIVERSE_INVALID: ${politicianEntries.length}`);
if (municipalityEntries.length !== 346) throw new Error(`DETAIL_MUNICIPALITY_UNIVERSE_INVALID: ${municipalityEntries.length}`);
if (new Set(politicianSlugs).size !== politicianSlugs.length) throw new Error("DETAIL_POLITICO_SLUGS_DUPLICATED");
if (new Set(municipalityEntries.map((entry) => entry.slug)).size !== municipalityEntries.length) throw new Error("DETAIL_MUNICIPALITY_SLUGS_DUPLICATED");

const politicianFiles = detailFiles("politico");
const municipalityFiles = detailFiles("municipalidades");
const missingPoliticians = politicianSlugs.filter((slug) => !politicianFiles.has(slug));
const missingMunicipalities = municipalityEntries.filter((entry) => !municipalityFiles.has(entry.slug));
if (missingPoliticians.length > 0) throw new Error(`DETAIL_POLITICO_HTML_MISSING: ${missingPoliticians.slice(0, 10).join(", ")}`);
if (missingMunicipalities.length > 0) throw new Error(`DETAIL_MUNICIPALITY_HTML_MISSING: ${missingMunicipalities.slice(0, 10).map((entry) => entry.slug).join(", ")}`);

for (const entry of politicianEntries) {
  const slug = entry.slug || slugify(entry.nombre);
  const html = await readHtml(join("politico", slug, "index.html"));
  assertHtmlIsUsable(html, entry.nombre, `politico/${slug}`);
  if (!Number.isInteger(entry.totalVotaciones) || entry.totalVotaciones < 1) {
    throw new Error(`DETAIL_POLITICO_DATA_MISSING: ${slug}`);
  }
}

for (const entry of municipalityEntries) {
  const html = await readHtml(join("municipalidades", entry.slug, "index.html"));
  assertHtmlIsUsable(html, `Municipalidad de ${entry.nombre_comuna}`, `municipalidades/${entry.slug}`);
}

console.log(JSON.stringify({
  politicos: { expected: politicianEntries.length, html: politicianFiles.size, checked: politicianEntries.length },
  municipalidades: { expected: municipalityEntries.length, html: municipalityFiles.size, checked: municipalityEntries.length },
  status: "ok",
}, null, 2));
