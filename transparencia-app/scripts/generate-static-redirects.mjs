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
const politicoRedirects = JSON.parse(await readFile(join(root, "data", "generated", "politico-redirects.json"), "utf8").catch(() => "[]"));
const redirects = [
  "/autoridades /personas?tab=parlamentarios 301",
  "/funcionarios /personas?tab=funcionarios 301",
  "/partidos/independientes /partidos/ind 301",
  ...MUNICIPALIDADES_SEED.map((municipalidad) =>
    `/municipalidades/${municipalidad.id} /municipalidades/${slugify(municipalidad.nombre_comuna)} 301`),
  ...politicoRedirects.map(({ from, to }) => `/politico/${from} /politico/${to} 301`),
].join("\n") + "\n";
await writeFile(join(root, "public", "_redirects"), redirects);
await mkdir(join(root, "out"), { recursive: true });
await writeFile(join(root, "out", "_redirects"), redirects);
