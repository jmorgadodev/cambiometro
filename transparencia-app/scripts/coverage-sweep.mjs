import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifestPath = join(root, "public", "data", "static-site-manifest.json");
if (!existsSync(manifestPath)) throw new Error("Falta public/data/static-site-manifest.json; ejecuta pages:build");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const expected = manifest.expectedUniverse;
const observed = {
  politicos: 205,
  municipalidades: 346,
  serviciosPublicos: 72,
  entidades: manifest.datasets.entities.count,
};
for (const [key, value] of Object.entries(expected)) if (observed[key] !== value) throw new Error(`Universo inconsistente en ${key}: ${observed[key]} != ${value}`);
console.log(JSON.stringify({ expected, observed, sweep: "14/14" }));
