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
type RosterMember = { id: string; cargo: string; partido_id?: string | null };
type Party = { id: string; sigla: string; nombre: string };

const normalizeOption = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const EFFECTIVE = new Set(["afirmativo", "a favor", "si", "en contra", "abstencion"]);

export function buildCohesionRows(roster: RosterMember[], source: VoteSource, parties: Party[] = []): CohesionBancada[] {
  const voteSource = source;
  const sessions = Object.values(voteSource.sessions ?? {}) as NonNullable<VoteSource["sessions"]>[string][];
  const votes = voteSource.votes ?? {};
  const partyById = new Map(parties.map((party) => [party.id, party]));
  const groups = new Map<string, { members: typeof roster; shares: number[]; sizes: number[] }>();

  for (const politician of roster) {
    const camara = politician.cargo === "Senador" ? "Senado" : "Cámara";
    const groupKey = `${politician.partido_id || "ind"}:${camara}`;
    const group = groups.get(groupKey) ?? { members: [], shares: [], sizes: [] };
    group.members.push(politician);
    groups.set(groupKey, group);
  }

  for (const [groupKey, group] of groups) {
    for (const session of sessions) {
      const counts = new Map<string, number>();
      for (const member of group.members) {
        const memberVotes: Array<[string, string]> = votes[member.id] ?? [];
        const vote = memberVotes.find(([sessionId]) => sessionId === session.id)?.[1];
        const option = vote ? normalizeOption(vote) : "";
        if (EFFECTIVE.has(option)) counts.set(option, (counts.get(option) ?? 0) + 1);
      }
      const effectiveMembers = [...counts.values()].reduce((sum, count) => sum + count, 0);
      if (effectiveMembers < 2) continue;
      const majorityShare = Math.max(...counts.values()) / effectiveMembers;
      group.shares.push(majorityShare * 100);
      group.sizes.push(effectiveMembers);
    }
    groups.set(groupKey, group);
  }

  const rows: CohesionBancada[] = [];
  for (const [groupKey, group] of groups) {
    const [partyId, camara] = groupKey.split(":") as [string, "Cámara" | "Senado"];
    const party = partyById.get(partyId);
    if (!group.shares.length) continue;
    rows.push({
      sigla: party?.sigla ?? (partyId === "ind" ? "IND" : partyId.toUpperCase()),
      nombre: party?.nombre ?? "Independientes",
      camara,
      cohesion_pct: Number((group.shares.reduce((sum, value) => sum + value, 0) / group.shares.length).toFixed(1)),
      votaciones_consideradas: group.shares.length,
      miembros_promedio: Number((group.sizes.reduce((sum, value) => sum + value, 0) / group.sizes.length).toFixed(1)),
    });
  }
  return rows.sort((left, right) => (right.cohesion_pct ?? -1) - (left.cohesion_pct ?? -1) || left.sigla.localeCompare(right.sigla) || left.camara.localeCompare(right.camara));
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
