import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const categories = ["Planta", "Contrata", "Honorarios", "CodigoTrabajo"];
const script = resolve("scripts/etl/stream-remote-personal.mjs");

console.warn("[DEPRECATED] Use npm run ingest:cplt-personal -- <categoria>. Ejecutando las cuatro fuentes oficiales sin crear archivos vacios.");

for (const category of categories) {
  const result = spawnSync(process.execPath, ["--max-old-space-size=6144", script, category], { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`CPLT_NATIONAL_INGEST_FAILED: ${category} (${result.status})`);
  }
}
