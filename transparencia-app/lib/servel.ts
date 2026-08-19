import fs from "fs";
import path from "path";
import { nameSequenceMatches } from "@/lib/data-source";

export interface ServelCandidato {
  id: string;
  name: string;
  official_id: string | null;
  contest: string;
  pact: string | null;
  pact_letter: string | null;
  party: string | null;
  subpact: string | null;
  elected: boolean;
  votes_total: number;
  distrito: string | null;
  circumscripcion: string | null;
  regiones: string[];
  porGeo: Array<{ geo: string; votes: number }>;
}

export interface ServelPacto {
  contest: string;
  pact: string;
  pact_letter: string | null;
  votes_total: number;
  candidatos: number;
  electos: number;
}

export interface ServelProyeccion {
  generatedAt: string;
  source: string;
  election_date: string;
  total_candidatos: number;
  candidatos: ServelCandidato[];
  pactos: ServelPacto[];
}

let cached: ServelProyeccion | null = null;

/**
 * Proyección v1 de resultados SERVEL (elección general 2025-11-16): candidatos
 * agregados a nivel nacional con desglose por distrito/circunscripción, y pactos
 * por contienda. Generada por scripts/build-servel-v1.mjs desde las particiones
 * del lake. Alimenta la ficha del político (si fue candidato) y los rankings.
 */
export function leerServelV1(): ServelProyeccion | null {
  if (cached) return cached;
  try {
    const file = path.join(process.cwd(), "data", "lake", "projections", "v1", "servel.json");
    cached = JSON.parse(fs.readFileSync(file, "utf8")) as ServelProyeccion;
    return cached;
  } catch {
    cached = null;
    return null;
  }
}

export function servelParaPolitico(nombreCompleto: string): ServelCandidato | null {
  const candidato = leerServelV1()?.candidatos.find((c) => nameSequenceMatches(c.name, nombreCompleto)) ?? null;
  return candidato ?? null;
}