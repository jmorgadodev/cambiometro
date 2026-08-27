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
const serviceRedirects = [...serviceSource.matchAll(/\{ id: '([^']+)', nombre: '([^']+)'/g)]
  .map(([, id, name]) => ({
    from: `/servicios-publicos/${id}`,
    to: `/servicios-publicos/${slugify(name)}`,
  }));
const simpleRedirects = [
  ["/autoridades", "/personas?tab=parlamentarios"],
  ["/funcionarios", "/personas?tab=funcionarios"],
  ["/partidos/independientes", "/partidos/ind"],
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
  ...serviceRedirects.flatMap(({ from, to }) => redirectVariants(from, to)),
  ...politicoRedirects.flatMap(({ from, to }) => redirectVariants(`/politico/${from}`, `/politico/${to}`)),
].join("\n") + "\n";
await writeFile(join(root, "public", "_redirects"), redirects);
await mkdir(join(root, "out"), { recursive: true });
await writeFile(join(root, "out", "_redirects"), redirects);
