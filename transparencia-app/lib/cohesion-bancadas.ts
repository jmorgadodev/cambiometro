import { partyAtVoteDate, isValidVoteDate, type DatedPartyMembership } from "./party-membership-periods.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface CohesionBancada {
  sigla: string;
  nombre: string;
  camara: "Cámara" | "Senado";
  cohesion_pct: number | null;
  votaciones_consideradas: number;
  miembros_promedio: number | null;
  estado?: "Sin muestra";
}

type VoteSource = {
  sessions?: Record<string, { id?: string; fecha?: string; nombre?: string; descripcion?: string; resultado?: string; fuente?: string; url?: string }>;
  votes?: Record<string, Array<[string, string]>>;
};
type RosterMember = { id: string; cargo: string; partido_id?: string | null; militancias?: DatedPartyMembership[] };
type Party = { id: string; sigla: string; nombre: string };

const normalizeOption = (value: string) => {
  const option = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (["afirmativo", "a favor", "si"].includes(option)) return "afirmativo";
  if (["en contra", "no"].includes(option)) return "en contra";
  return option;
};
const EFFECTIVE = new Set(["afirmativo", "a favor", "si", "en contra", "abstencion"]);

export function buildCohesionRows(roster: RosterMember[], source: VoteSource, parties: Party[] = []): CohesionBancada[] {
  const partyById = new Map(parties.map(party => [party.id, party]));
  const voteIndex = new Map<string, Map<string, string[]>>();
  for (const [person, entries] of Object.entries(source.votes ?? {})) {
    const index = new Map<string, string[]>();
    for (const [id, option] of entries) index.set(id, [...(index.get(id) ?? []), normalizeOption(option)]);
    voteIndex.set(person, index);
  }
  const groups = new Map<string, { shares: number[]; sizes: number[] }>();
  for (const [id, session] of Object.entries(source.sessions ?? {})) {
    if (!isValidVoteDate(session.fecha)) continue;
    const declaredChamber = session.fuente === "senado" ? "Senado" : session.fuente === "camara" ? "Cámara" : null;
    const idChamber = id.startsWith("senado-vot-") ? "Senado" : id.startsWith("camara-vot-") ? "Cámara" : null;
    if (declaredChamber && idChamber && declaredChamber !== idChamber) continue;
    const chamber = declaredChamber ?? idChamber;
    if (!chamber) continue;
    const members = new Map<string, RosterMember[]>();
    for (const person of roster) {
      if ((person.cargo === "Senador" ? "Senado" : "Cámara") !== chamber) continue;
      const party = partyAtVoteDate(person, session.fecha);
      if (!party) continue;
      members.set(party, [...(members.get(party) ?? []), person]);
    }
    for (const [party, people] of members) {
      const rows = people.map(person => voteIndex.get(person.id)?.get(session.id ?? id) ?? []);
      // No sustituir filas ausentes/duplicadas por un voto ni calcular una muestra parcial.
      if (rows.some(options => options.length !== 1)) continue;
      const options = rows.map(row => row[0]);
      if (options.some(option => !EFFECTIVE.has(option) && !["no vota", "pareo", "dispensado", "ausente", "sin emitir", "no emite"].includes(option))) continue;
      const counts = new Map<string, number>();
      for (const option of options) if (EFFECTIVE.has(option)) counts.set(option, (counts.get(option) ?? 0) + 1);
      const effective = [...counts.values()].reduce((sum, n) => sum + n, 0);
      if (effective < 2) continue;
      const key = `${party}:${chamber}`;
      const group = groups.get(key) ?? { shares: [], sizes: [] };
      group.shares.push(Math.max(...counts.values()) / effective * 100); group.sizes.push(effective);
      groups.set(key, group);
    }
  }
  return [...groups].map(([key, group]) => {
    const [partyId, chamber] = key.split(":") as [string, "Cámara" | "Senado"];
    const party = partyById.get(partyId);
    return { sigla: party?.sigla ?? (partyId === "ind" ? "IND" : partyId.toUpperCase()),
      nombre: party?.nombre ?? (partyId === "ind" ? "Independientes" : partyId), camara: chamber,
      cohesion_pct: Number((group.shares.reduce((sum, n) => sum + n, 0) / group.shares.length).toFixed(1)),
      votaciones_consideradas: group.shares.length,
      miembros_promedio: Number((group.sizes.reduce((sum, n) => sum + n, 0) / group.sizes.length).toFixed(1)) };
  }).sort((a, b) => (b.cohesion_pct ?? -1) - (a.cohesion_pct ?? -1) || a.sigla.localeCompare(b.sigla) || a.camara.localeCompare(b.camara));
}

export function readPublishedCohesion(): CohesionBancada[] {
  try {
    const value = JSON.parse(readFileSync(join(process.cwd(), "data", "cohesion-bancadas.json"), "utf8"));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function cohesionForPolitico(partidoSigla: string, cargo: string): CohesionBancada | null {
  const camara = cargo === "Senador" ? "Senado" : "Cámara";
  return readPublishedCohesion().find((row) => row.sigla === (partidoSigla || "IND") && row.camara === camara) ?? null;
}
