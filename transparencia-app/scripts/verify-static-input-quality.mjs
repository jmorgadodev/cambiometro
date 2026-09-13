import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertStaticInputContentQuality, STATIC_SITE_FILE_PATHS } from "./static-site-inputs.mjs";

const root = resolve(import.meta.dirname, "..");
const required = [
  "data/lake/projections/v1/chilecompra.json",
  "data/lake-subsets/chilecompra.subset.json",
  "data/lake-subsets/infolobby.subset.json",
  "data/politicos-votaciones.json",
];

for (const relativePath of required) {
  if (!STATIC_SITE_FILE_PATHS.includes(relativePath)) throw new Error(`STATIC_INPUT_NOT_ALLOWLISTED: ${relativePath}`);
  const filePath = resolve(root, relativePath);
  if (!existsSync(filePath)) throw new Error(`STATIC_INPUT_REQUIRED_MISSING: ${relativePath}`);
  assertStaticInputContentQuality(relativePath, readFileSync(filePath));
}

console.log(JSON.stringify({ action: "verified", files: required.length }, null, 2));
