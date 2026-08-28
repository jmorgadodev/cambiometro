import entries from "../data/votaciones-destacadas.json";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PARTIDOS_SEED } from "./partidos";
import { POLITICOS_SEED } from "./seed-politicos";
import { getPoliticoSlug } from "./politico-slugs";

export interface VotacionDestacada {
  votacion_id: string;
  boletin: string;
  camara: "Cámara" | "Senado";
  fecha: string;
  titulo: string;
  resumen: string;
  resultado: "Aprobado" | "Rechazado" | "En trámite" | "Retirado";
  tags: string[];
  fuente_url: string;
}

export const VOTACIONES_DESTACADAS = entries as VotacionDestacada[];

/** Make generic boletin titles understandable without inventing a project name. */
export type OpcionVotacion = "Afirmativo" | "En Contra" | "Abstención" | "No Vota" | "Dispensado" | "Pareo";

export interface VotacionNominalDetalle {
  politico_id: string;
  nombre: string;
  cargo: "Diputado" | "Senador";
  partido_id: string;
  partido_sigla: string;
  partido_nombre: string;
  opcion: OpcionVotacion;
  slug: string;
}

export interface VotacionBancadaDetalle {
  partido_id: string;
  sigla: string;
  nombre: string;
  miembros: number;
  efectivos: number;
  afirmativo: number;
  enContra: number;
  abstencion: number;
  noVota: number;
  cuotaMayoria: number | null;
  opcionMayoritaria: "Afirmativo" | "En Contra" | "Abstención" | null;
  disenso: number;
}

export interface VotacionAnalisis {
  opcionMayoritaria: "Afirmativo" | "En Contra" | "Abstención" | null;
  mayoriaPct: number;
  participacionPct: number;
  bancadasConMuestra: number;
  bancadasAlineadas: number;
  bancadasConDisenso: number;
}

export interface VotacionDestacadaDetalle {
  votacion_id: string;
  boletin: string;
  camara: "Cámara" | "Senado";
  fecha: string;
  titulo: string;
  resumen: string;
  resultado: VotacionDestacada["resultado"];
  resultadoRecalculado: VotacionDestacada["resultado"];
  quorum: string | null;
  tipo: string | null;
  tramite: string | null;
  descripcionOficial: string | null;
  fuente_url: string;
  totales: {
    padron: number;
    afirmativo: number;
    enContra: number;
    abstencion: number;
    noVota: number;
    efectivos: number;
    margenMayoria: number;
  };
  analisis: VotacionAnalisis;
  nominales: VotacionNominalDetalle[];
  bancadas: VotacionBancadaDetalle[];
}

interface SessionSource {
  id: string;
  fecha?: string;
  descripcion?: string;
  nombre?: string;
  resultado?: string;
  quorum?: string;
  tipo?: string;
  url?: string;
  url_tramitacion?: string;
  tramite?: string;
  fuente?: "camara" | "senado";
}

interface VotingSource {
  sessions: Record<string, SessionSource>;
  votes: Record<string, [string, string][]>;
}

let votingSourceCache: VotingSource | null = null;

function loadVotingSource(): VotingSource {
  if (votingSourceCache) return votingSourceCache;
  try {
    votingSourceCache = JSON.parse(readFileSync(join(process.cwd(), "data", "politicos-votaciones.json"), "utf8")) as VotingSource;
  } catch {
    votingSourceCache = { sessions: {}, votes: {} };
  }
  return votingSourceCache;
}

function normalizeOption(value: string | undefined): OpcionVotacion {
  const normalized = (value || "No Vota").trim().toLowerCase();
  if (normalized === "afirmativo" || normalized === "sí" || normalized === "si" || normalized === "a favor") return "Afirmativo";
  if (normalized === "en contra" || normalized === "no") return "En Contra";
  if (normalized === "abstención" || normalized === "abstencion") return "Abstención";
  if (normalized === "dispensado") return "Dispensado";
  if (normalized === "pareo") return "Pareo";
  return "No Vota";
}

function recalculateResult(afirmativo: number, enContra: number, abstencion: number): VotacionDestacada["resultado"] {
  if (afirmativo === 0 && enContra === 0 && abstencion === 0) return "En trámite";
  return afirmativo > enContra && afirmativo >= abstencion ? "Aprobado" : "Rechazado";
}

function majorityOption(afirmativo: number, enContra: number, abstencion: number): VotacionAnalisis["opcionMayoritaria"] {
  const ordered = [
    { option: "Afirmativo" as const, value: afirmativo },
    { option: "En Contra" as const, value: enContra },
    { option: "Abstención" as const, value: abstencion },
  ];
  const winner = ordered.reduce((best, current) => current.value > best.value ? current : best, ordered[0]);
  return winner.value > 0 ? winner.option : null;
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Builds a compact, static detail model from the same nominal source used by
 * party statistics. It is called at build time by the page, never by the API.
 */
export function getVotacionDestacadaDetalle(votacionId: string): VotacionDestacadaDetalle | undefined {
  const entry = VOTACIONES_DESTACADAS.find((candidate) => candidate.votacion_id === votacionId);
  if (!entry) return undefined;

  const source = loadVotingSource();
  const session = source.sessions[votacionId];
  if (!session) return undefined;

  const votesByPolitician = new Map<string, string>();
  for (const [politicoId, voteList] of Object.entries(source.votes)) {
    const vote = voteList.find(([sessionId]) => sessionId === votacionId);
    if (vote) votesByPolitician.set(politicoId, vote[1]);
  }

  const expectedCargo = entry.camara === "Senado" ? "Senador" : "Diputado";
  const roster = POLITICOS_SEED.filter((politico) => politico.cargo === expectedCargo);
  const nominales: VotacionNominalDetalle[] = roster.map((politico) => {
    const party = PARTIDOS_SEED.find((candidate) => candidate.id === politico.partido_id);
    return {
      politico_id: politico.id,
      nombre: politico.nombre_completo,
      cargo: politico.cargo,
      partido_id: politico.partido_id,
      partido_sigla: party?.sigla ?? "IND",
      partido_nombre: party?.nombre ?? "Independientes / Sin partido",
      opcion: normalizeOption(votesByPolitician.get(politico.id)),
      slug: getPoliticoSlug(politico),
    };
  });

  const count = (opcion: OpcionVotacion) => nominales.filter((vote) => vote.opcion === opcion).length;
  const afirmativo = count("Afirmativo");
  const enContra = count("En Contra");
  const abstencion = count("Abstención");
  const noVota = nominales.length - afirmativo - enContra - abstencion;
  const efectivos = afirmativo + enContra + abstencion;
  const sortedOptions = [afirmativo, enContra, abstencion].sort((a, b) => b - a);
  const margenMayoria = sortedOptions[0] - (sortedOptions[1] ?? 0);

  const byParty = new Map<string, VotacionBancadaDetalle>();
  for (const vote of nominales) {
    const existing = byParty.get(vote.partido_id) ?? {
      partido_id: vote.partido_id,
      sigla: vote.partido_sigla,
      nombre: vote.partido_nombre,
      miembros: 0,
      efectivos: 0,
      afirmativo: 0,
      enContra: 0,
      abstencion: 0,
      noVota: 0,
      cuotaMayoria: null,
      opcionMayoritaria: null,
      disenso: 0,
    };
    existing.miembros += 1;
    if (vote.opcion === "Afirmativo") existing.afirmativo += 1;
    else if (vote.opcion === "En Contra") existing.enContra += 1;
    else if (vote.opcion === "Abstención") existing.abstencion += 1;
    else existing.noVota += 1;
    existing.efectivos = existing.afirmativo + existing.enContra + existing.abstencion;
    existing.opcionMayoritaria = majorityOption(existing.afirmativo, existing.enContra, existing.abstencion);
    const maxVotes = Math.max(existing.afirmativo, existing.enContra, existing.abstencion);
    existing.cuotaMayoria = existing.efectivos > 0 ? roundOne((maxVotes / existing.efectivos) * 100) : null;
    existing.disenso = existing.efectivos > 0 ? existing.efectivos - maxVotes : 0;
    byParty.set(vote.partido_id, existing);
  }

  const resultadoRecalculado = recalculateResult(afirmativo, enContra, abstencion);
  const opcionMayoritaria = majorityOption(afirmativo, enContra, abstencion);
  const bancadas = [...byParty.values()].sort((a, b) => b.efectivos - a.efectivos || a.sigla.localeCompare(b.sigla));
  const bancadasConMuestra = bancadas.filter((bancada) => bancada.efectivos > 0);
  const bancadasAlineadas = opcionMayoritaria
    ? bancadasConMuestra.filter((bancada) => bancada.opcionMayoritaria === opcionMayoritaria).length
    : 0;
  return {
    votacion_id: entry.votacion_id,
    boletin: entry.boletin,
    camara: entry.camara,
    fecha: entry.fecha,
    titulo: entry.titulo,
    resumen: entry.resumen,
    resultado: entry.resultado,
    resultadoRecalculado,
    quorum: session.quorum ?? null,
    tipo: session.tipo ?? null,
    tramite: session.tramite ?? null,
    descripcionOficial: session.descripcion ?? session.nombre ?? null,
    fuente_url: entry.fuente_url,
    totales: { padron: nominales.length, afirmativo, enContra, abstencion, noVota, efectivos, margenMayoria },
    analisis: {
      opcionMayoritaria,
      mayoriaPct: efectivos > 0 && opcionMayoritaria ? roundOne((Math.max(afirmativo, enContra, abstencion) / efectivos) * 100) : 0,
      participacionPct: nominales.length > 0 ? roundOne((efectivos / nominales.length) * 100) : 0,
      bancadasConMuestra: bancadasConMuestra.length,
      bancadasAlineadas,
      bancadasConDisenso: bancadasConMuestra.filter((bancada) => bancada.disenso > 0).length,
    },
    nominales,
    bancadas,
  };
}
