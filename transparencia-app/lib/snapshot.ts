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
    // En Cloudflare Workers (donde existe WebSocketPair o caches globales),
    // el snapshot masivo no forma parte del bundle local y D1 es la fuente canónica.
    if (typeof (globalThis as any).WebSocketPair !== "undefined" || typeof (globalThis as any).caches !== "undefined") {
      cached = { fuentes: {} };
      return cached;
    }
    const file = path.join(process.cwd(), "data", "etl", "latest.json");
    try {
      cached = fs.existsSync(file)
        ? JSON.parse(fs.readFileSync(file, "utf8")) as Snapshot
        : { fuentes: {} };
    } catch {
      cached = { fuentes: {} };
    }
  }
  return cached;
}
