import fs from "fs";
import path from "path";
import type { EtlRecord } from "@/lib/data-source";

export interface Snapshot {
  fuentes: Record<string, EtlRecord[]>;
}

let cached: Snapshot | null = null;

/**
 * Carga el snapshot ETL en runtime (fs + JSON.parse) y lo cachea en memoria.
 * Evita que Next/Turbopack transforme el JSON de ~36 MB en cada compilación
 * de ruta, que es lo que colgaba el dev server.
 */
export function leerSnapshot(): Snapshot {
  if (!cached) {
    const file = path.join(process.cwd(), "data", "etl", "latest.json");
    try {
      cached = fs.existsSync(file)
        ? JSON.parse(fs.readFileSync(file, "utf8")) as Snapshot
        : { fuentes: {} };
    } catch {
      // En Workers el snapshot masivo no forma parte del bundle: D1 es la fuente
      // canónica y este fallback queda vacío para las rutas legacy.
      cached = { fuentes: {} };
    }
  }
  return cached;
}
