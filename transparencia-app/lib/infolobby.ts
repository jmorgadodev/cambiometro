import fs from "fs";
import path from "path";
import infolobbyStaticJson from "@/data/lake-subsets/infolobby.subset.json";
import type { EtlRecord } from "@/lib/data-source";

export type LobbyEventKind = "audience" | "travel" | "gift";

export interface InfoLobbySujeto {
  id: string | null;
  name: string;
  cargo: string | null;
  audiencias: number;
  viajes: number;
  donativos: number;
  total: number;
  organismos: Array<{ id: string; name: string }>;
}

export interface InfoLobbyOrganismo {
  id: string | null;
  name: string;
  audiencias: number;
  viajes: number;
  donativos: number;
  total: number;
  sujetos: Array<{ name: string; count: number }>;
}

export interface InfoLobbyProjection {
  generatedAt: string;
  source: string;
  count: number;
  periodos: string[];
  records: Array<EtlRecord & { lobby_event_kind?: LobbyEventKind }>;
  sujetos: InfoLobbySujeto[];
  organismos: InfoLobbyOrganismo[];
}

let cached: InfoLobbyProjection | null = null;

function isUsableProjection(value: InfoLobbyProjection | null): value is InfoLobbyProjection {
  return Boolean(value && Array.isArray(value.records) && value.records.length > 0);
}

/**
 * Proyección v1 de registros InfoLobby (ley 20.730) generada por
 * scripts/build-infolobby-v1.mjs desde las particiones del lake.
 * La ficha del político prioriza estos registros —con sujetos pasivos y
 * organismo oficial— sobre la ventana legacy del snapshot ETL. Las tablas de
 * /cruces usan los agregados `sujetos` y `organismos`. Carga con fs en scripts locales y fallback a JSON empaquetado en Worker.
 */
export function leerInfoLobbyV1(): InfoLobbyProjection | null {
  if (cached) return cached;
  try {
    const fullFile = path.join(
      process.cwd(),
      "data",
      "lake",
      "projections",
      "v1",
      "infolobby.json",
    );
    const subsetFile = path.join(
      process.cwd(),
      "data",
      "lake-subsets",
      "infolobby.subset.json",
    );
    for (const targetFile of [fullFile, subsetFile]) {
      if (!fs.existsSync(targetFile)) continue;
      const candidate = JSON.parse(fs.readFileSync(targetFile, "utf8")) as InfoLobbyProjection;
      if (isUsableProjection(candidate)) {
        cached = candidate;
        return cached;
      }
    }
  } catch {}
  const bundled = (infolobbyStaticJson as unknown) as InfoLobbyProjection;
  cached = isUsableProjection(bundled) ? bundled : null;
  return cached;
}
