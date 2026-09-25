import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MUNICIPALIDADES_SEED } from "../lib/municipalidades.ts";

const slugify = (value) => value
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9\s-]/g, "")
  .trim()
  .replace(/\s+/g, "-")
  .replace(/-+/g, "-");

const root = fileURLToPath(new URL("../", import.meta.url));
const redirectVariants = (from, to) => [
  `${from} ${to} 301`,
  `${from}/ ${to} 301`,
];
const politicoRedirects = JSON.parse(await readFile(join(root, "data", "generated", "politico-redirects.json"), "utf8").catch(() => "[]"));
const serviceSource = await readFile(join(root, "lib", "servicios-publicos.ts"), "utf8");
const serviceSeeds = [...serviceSource.matchAll(/\{ id: '([^']+)', nombre: '((?:\\'|[^'])*)'/g)]
  .map(([, id, escapedName]) => [id, escapedName.replace(/\\'/g, "'").replace(/\\\\/g, "\\")]);
const additionalOrganizations = JSON.parse(await readFile(
  join(root, "data", "raw", "transparencia_activa", "organismos_adicionales.json"),
  "utf8",
));
const legacyOrganizationRedirects = additionalOrganizations
  .filter((organization) => typeof organization.id === "string"
    && organization.id.startsWith("org-")
    && typeof organization.nombre === "string")
  .filter((organization) => organization.id.slice("org-".length) !== slugify(organization.nombre))
  .map((organization) => ({
    from: `/servicios-publicos/${organization.id}`,
    to: `/servicios-publicos/${slugify(organization.nombre)}/`,
  }));
const serviceRedirects = [
  ...serviceSeeds.map(([id, name]) => ({ from: `/servicios-publicos/${id}`, to: `/servicios-publicos/${slugify(name)}/` })),
  ...legacyOrganizationRedirects,
].filter(({ from, to }) => from !== to);
const simpleRedirects = [
  ["/autoridades", "/personas?tab=parlamentarios"],
  ["/funcionarios", "/personas?tab=funcionarios"],
  ["/partidos/independientes", "/partidos/ind"],
  ["/remuneraciones", "/remuneraciones-publicas"],
];
const canonicalRedirects = ["/votaciones-destacadas /votaciones-destacadas/ 301"];
const redirects = [
  ...canonicalRedirects,
  ...simpleRedirects.flatMap(([from, to]) => redirectVariants(from, to)),
  ...MUNICIPALIDADES_SEED.flatMap((municipalidad) => {
    const from = `/municipalidades/${municipalidad.id}`;
    const to = `/municipalidades/${slugify(municipalidad.nombre_comuna)}`;
    return [`${from} ${to} 301`, `${from}/ ${to} 301`];
  }),
  ...MUNICIPALIDADES_SEED.flatMap((municipalidad) => {
    // Los IDs históricos municipality-cl-* siguen siendo enlaces públicos.
    // Deben llegar a la ficha territorial canónica, no a la ficha genérica de entidad.
    const from = `/entidades/municipality-cl-${municipalidad.cut}`;
    const to = `/municipalidades/${slugify(municipalidad.nombre_comuna)}`;
    return [`${from} ${to} 301`, `${from}/ ${to} 301`];
  }),
  ...serviceRedirects.flatMap(({ from, to }) => redirectVariants(from, to)),
  ...politicoRedirects.flatMap(({ from, to }) => redirectVariants(`/politico/${from}`, `/politico/${to}`)),
  // The 468 legacy `org-*` identifiers map exactly to the canonical slug after
  // removing `org-`; use two dynamic rules instead of spending 936 static slots.
  "/servicios-publicos/org-:slug /servicios-publicos/:slug/ 301",
  "/servicios-publicos/org-:slug/ /servicios-publicos/:slug/ 301",
].join("\n") + "\n";
const redirectLines = redirects.trimEnd().split("\n");
const dynamicRedirectCount = redirectLines.filter((line) => /:[A-Za-z][\w]*/.test(line.split(" ")[0])).length;
const staticRedirectCount = redirectLines.length - dynamicRedirectCount;
if (staticRedirectCount > 2000 || dynamicRedirectCount > 100 || redirectLines.length > 2100) {
  throw new Error(`PAGES_REDIRECT_LIMIT: ${staticRedirectCount} estáticas + ${dynamicRedirectCount} dinámicas`);
}
await writeFile(join(root, "public", "_redirects"), redirects);
await mkdir(join(root, "out"), { recursive: true });
await writeFile(join(root, "out", "_redirects"), redirects);
