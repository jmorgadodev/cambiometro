/**
 * Merge de proyecciones del lake hacia el snapshot ETL en memoria.
 * Usado por scripts/etl.mjs antes de escribir latest.json para que las
 * proyecciones (ej: auditorías de Contraloría) sobrevivan a la regeneración
 * del snapshot y queden incluidas en publish-plan.json / R2.
 */
import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const PROJECTIONS = [
  { sourceId: "contraloria", file: join(root, "data", "lake", "projections", "v1", "contraloria.json") },
];

export function mergeLakeProjections(snapshot) {
  snapshot.fuentes = snapshot.fuentes ?? {};
  for (const projection of PROJECTIONS) {
    try {
      const parsed = JSON.parse(readFileSync(projection.file, "utf8"));
      if (!Array.isArray(parsed.records)) {
        console.warn(`[etl] proyección ${projection.sourceId}: sin records, se omite.`);
        continue;
      }
      snapshot.fuentes[projection.sourceId] = parsed.records;
      console.log(`[etl] fuentes.${projection.sourceId} ← ${parsed.records.length} registros (proyección lake)`);
    } catch {
      console.warn(`[etl] proyección ${projection.sourceId}: no disponible, se omite.`);
    }
  }
  return snapshot;
}