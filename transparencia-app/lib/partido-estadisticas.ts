import { POLITICOS_SEED, PARTIDOS_SEED } from "@/lib/seed-politicos";
import type { Politico } from "@/lib/politicos";
import { COLOR_ABST, COLOR_NO, COLOR_NO_VOTA, COLOR_SI } from "@/lib/colores-votacion";
import { getKvCache } from "@/lib/db";
import { diputadoIdParaPolitico } from "@/lib/data-source";
import { personalApoyoParaDiputado, personalApoyoParaSenador, leerPersonalApoyo } from "@/lib/personal-apoyo";
import { COALICION_POR_PARTIDO } from "@/lib/partido-electoral-data";
import { readFileSync } from "node:fs";
import { join } from "node:path";
let PARTIDOS_STATS_FALLBACK: Record<string, unknown> = {};
try {
  PARTIDOS_STATS_FALLBACK = JSON.parse(readFileSync(join(process.cwd(), "data", "lake-subsets", "partidos-stats.subset.json"), "utf8"));
} catch {
  // The Worker/API path does not bundle the local build-only fallback.
}

export interface DetalleRebelde {
  politico_id: string;
  nombre: string;
  opcion: string;
}

export interface SesionRebelde {
  id: string;
  fecha: string | null;
  descripcion: string | null;
  tramite: string | null;
  url_tramitacion: string | null;
  votosRebeldesCount: number;
  votosMayoriaCount: number;
  opcionMayoria: string;
  rebeldes: DetalleRebelde[];
}

export interface DisciplinaBancada {
  totalVotosConscientes: number;
  totalVotosCoincidentes: number;
  totalVotosRebeldes: number;
  pctDisciplina: number | null;
  pctRebelion: number | null;
  topVotosRebeldes: SesionRebelde[];
}

export interface PartidoEstadistica {
  votosCamara: ConteoOpciones;
  votosSenado: ConteoOpciones;
  votaciones: FilaVotacionPartido[];
  asistencia: SerieAsistencia[];
  disciplina?: DisciplinaBancada;
  gastos: GastoPartido;
}

let cached: Record<string, PartidoEstadistica> | null = null;
let cachedPromise: Promise<Record<string, PartidoEstadistica> | null> | null = null;

export async function getAllPartidosStats(): Promise<Record<string, PartidoEstadistica>> {
  if (!cached) {
    cachedPromise ??= getKvCache<Record<string, PartidoEstadistica>>("partidos-stats.json");
    const kvData = await cachedPromise;
    cached = kvData || (PARTIDOS_STATS_FALLBACK as unknown as Record<string, PartidoEstadistica>);
  }
  return cached ?? (PARTIDOS_STATS_FALLBACK as unknown as Record<string, PartidoEstadistica>);
}

export async function getPartidoEstadisticas(partidoId: string): Promise<PartidoEstadistica | null> {
  const normId = normalizePartidoId(partidoId);
  const all = await getAllPartidosStats();
  return all?.[normId] ?? (PARTIDOS_STATS_FALLBACK as Record<string, unknown>)[normId] as PartidoEstadistica ?? null;
}

export function normalizePartidoId(id: string): string {
  const low = id.toLowerCase().trim();
  if (low === "independientes" || low === "independiente" || low === "sin partido") return "ind";
  if (low === "republicanos" || low === "part-rep") return "rep";
  if (low === "amarillos") return "ama";
  if (low === "democratas") return "dem";
  return low;
}

export { COLOR_ABST, COLOR_NO, COLOR_NO_VOTA, COLOR_SI };

export const OPCION_SI = "Afirmativo";
export const OPCION_NO = "En Contra";
export const OPCION_ABST = "Abstención";
export const OPCION_NO_VOTA = "No Vota";
export const OPCION_DISPENSADO = "Dispensado";

export interface ConteoOpciones {
  afirmativo: number;
  enContra: number;
  abstencion: number;
  noVota: number;
  dispensado: number;
  apariciones: number;
  emitidos: number;
  asistencia: number;
  pctSi: number;
  pctNo: number;
  pctAbst: number;
  pctNoVota: number;
}

export interface FilaVotacionPartido {
  id: string;
  fecha: string | null;
  descripcion: string | null;
  tramite: string | null;
  resultado: string | null;
  si: number;
  no: number;
  abst: number;
  noVota: number;
  apariciones: number;
  pctSi: number;
  url_tramitacion: string | null;
  votosNominales?: { politico_id: string; nombre: string; opcion: string }[];
}

export interface SerieAsistencia {
  sesion: string;
  fecha: string;
  asistencia: number;
  apariciones?: number;
  presentes?: number;
  total?: number;
}

export interface GastoPartido {
  total: number;
  porMes: { periodo: string; total: number }[];
  porItem: { item: string; total: number }[];
  porPolitico: { politico_id: string; nombre: string; cargo: string; total: number }[];
}

export interface PersonalApoyoPartido {
  totalMensual: number;
  totalPersonas: number;
  promedioPorParlamentario: number;
  parlamentariosConPersonal: number;
  totalParlamentarios: number;
  cobertura: string;
}

export interface PartidoResumenCompleto {
  id: string;
  slug: string;
  sigla: string;
  nombre: string;
  color_hex: string;
  logo_url?: string;
  esIndependiente: boolean;
  coalicion: "Oficialismo" | "Oposición" | "Independientes";
  pacto: string;
  diputados: number;
  senadores: number;
  totalEscaños: number;
  pctEscaños: number;
  votosCamara: ConteoOpciones;
  votosSenado: ConteoOpciones;
  pctSi: number;
  pctNo: number;
  pctAbst: number;
  pctNoVota: number;
  asistencia: number;
  pctDisciplina: number | null;
  pctRebelion: number | null;
  gastosTotal: number;
  gastosPorMes: Record<string, number>;
  promedioGastoPorParlamentario: number;
  coberturaGastos: string;
  personalApoyoTotal: number;
  personalApoyoPersonas: number;
  personalApoyoPromedio: number;
  coberturaPersonal: string;
}

export function politicosDelPartido(partidoId: string): Politico[] {
  const norm = normalizePartidoId(partidoId);
  return POLITICOS_SEED.filter((p) => {
    const pid = normalizePartidoId(p.partido_id ?? "ind");
    return pid === norm;
  });
}

export function escañosDelPartido(partidoId: string): { diputados: number; senadores: number; total: number } {
  const pols = politicosDelPartido(partidoId);
  const diputados = pols.filter((p) => p.cargo === "Diputado").length;
  return { diputados, senadores: pols.length - diputados, total: pols.length };
}

/** Conteo agregado de cómo ha votado el partido en una cámara (Cámara o Senado). */
export async function resumenVotosPartido(partidoId: string, fuente: "votaciones_camara" | "votaciones_senado"): Promise<ConteoOpciones> {
  const stats = await getPartidoEstadisticas(partidoId);
  return stats?.[fuente === "votaciones_camara" ? "votosCamara" : "votosSenado"] ?? {
    afirmativo: 0, enContra: 0, abstencion: 0, noVota: 0, dispensado: 0, apariciones: 0, emitidos: 0, asistencia: 0, pctSi: 0, pctNo: 0, pctAbst: 0, pctNoVota: 0
  };
}

/** Detalle votación a votación (más recientes primero) para la gráfica y la tabla del partido. */
export async function votacionesDelPartido(partidoId: string, limite = 100): Promise<FilaVotacionPartido[]> {
  const stats = await getPartidoEstadisticas(partidoId);
  return (stats?.votaciones ?? []).slice(0, limite);
}

/** Asistencia a votaciones por sesión de sala, para la serie temporal. */
export async function asistenciaPorSesion(partidoId: string): Promise<SerieAsistencia[]> {
  const stats = await getPartidoEstadisticas(partidoId);
  return stats?.asistencia ?? [];
}

/** Disciplina de bancada y sesiones de votos rebeldes. */
export async function disciplinaDelPartido(partidoId: string): Promise<DisciplinaBancada> {
  const stats = await getPartidoEstadisticas(partidoId);
  return stats?.disciplina ?? {
    totalVotosConscientes: 0,
    totalVotosCoincidentes: 0,
    totalVotosRebeldes: 0,
    pctDisciplina: null,
    pctRebelion: null,
    topVotosRebeldes: [],
  };
}

/** Gastos operacionales reportados por los parlamentarios del partido. */
export async function gastosDelPartido(partidoId: string): Promise<GastoPartido> {
  const stats = await getPartidoEstadisticas(partidoId);
  return stats?.gastos ?? { total: 0, porMes: [], porItem: [], porPolitico: [] };
}

/** Agregación de personal de apoyo para todos los miembros de un partido. */
export async function personalApoyoDelPartido(partidoId: string): Promise<PersonalApoyoPartido> {
  const pols = politicosDelPartido(partidoId);
  const dataset = await leerPersonalApoyo();
  let totalMensual = 0;
  let totalPersonas = 0;
  let conPersonal = 0;

  for (const pol of pols) {
    if (pol.cargo === "Diputado") {
      const idDip = diputadoIdParaPolitico(pol);
      const dip = idDip ? dataset?.diputados?.[String(idDip)] : null;
      const filas = dip?.personal_apoyo ?? [];
      const total = filas.reduce((tot, f) => tot + (f.sueldo ?? 0), 0);
      if (total > 0) {
        totalMensual += total;
        totalPersonas += filas.length;
        conPersonal += 1;
      }
    } else {
      const nom = pol.nombre_completo.toUpperCase();
      const matched = Object.entries(dataset?.senadores ?? {}).find(([ofi]) => {
        const u = ofi.toUpperCase();
        return nom.includes(u) || u.includes(nom.split(" ")[0]);
      });
      if (matched) {
        const total = (matched[1] ?? []).reduce((tot, r) => tot + (r.monto ?? 0), 0);
        if (total > 0) {
          totalMensual += total;
          totalPersonas += (matched[1] ?? []).length;
          conPersonal += 1;
        }
      }
    }
  }

  const promedio = pols.length > 0 ? Math.round(totalMensual / pols.length) : 0;
  return {
    totalMensual,
    totalPersonas,
    promedioPorParlamentario: promedio,
    parlamentariosConPersonal: conPersonal,
    totalParlamentarios: pols.length,
    cobertura: `${conPersonal}/${pols.length}`,
  };
}

/** Obtiene el resumen unificado de todos los partidos políticos + categoría especial Independientes. */
export async function getAllPartidosSummary(): Promise<PartidoResumenCompleto[]> {
  const TOTAL_CONGRESO = 205; // 155 Dip. + 50 Sen.

  const partidosConRepresentacion = PARTIDOS_SEED.filter((p) => {
    const pols = politicosDelPartido(p.id);
    return pols.length > 0;
  });

  const allStats = await getAllPartidosStats();

  const res: PartidoResumenCompleto[] = await Promise.all(
    partidosConRepresentacion.map(async (partido) => {
      const normId = normalizePartidoId(partido.id);
      const stats = allStats?.[normId] ?? (PARTIDOS_STATS_FALLBACK as Record<string, unknown>)[normId] as PartidoEstadistica ?? null;
      const escaños = escañosDelPartido(partido.id);
      const votosCamara = stats?.votosCamara ?? {
        afirmativo: 0, enContra: 0, abstencion: 0, noVota: 0, dispensado: 0, apariciones: 0, emitidos: 0, asistencia: 0, pctSi: 0, pctNo: 0, pctAbst: 0, pctNoVota: 0
      };
      const votosSenado = stats?.votosSenado ?? {
        afirmativo: 0, enContra: 0, abstencion: 0, noVota: 0, dispensado: 0, apariciones: 0, emitidos: 0, asistencia: 0, pctSi: 0, pctNo: 0, pctAbst: 0, pctNoVota: 0
      };
      const gastos = stats?.gastos ?? { total: 0, porMes: [], porItem: [], porPolitico: [] };
      const disciplina = stats?.disciplina ?? {
        totalVotosConscientes: 0, totalVotosCoincidentes: 0, totalVotosRebeldes: 0, pctDisciplina: null, pctRebelion: null, topVotosRebeldes: []
      };
      const apoyo = await personalApoyoDelPartido(partido.id);

      const emitidosCamara = votosCamara.emitidos || 0;
      const emitidosSenado = votosSenado.emitidos || 0;
      const totalEmitidos = emitidosCamara + emitidosSenado;

      const aparicionesTotales = (votosCamara.apariciones || 0) + (votosSenado.apariciones || 0);
      const asistenciaCombinada = aparicionesTotales > 0
        ? Math.round((totalEmitidos / aparicionesTotales) * 1000) / 10
        : votosCamara.asistencia || 0;

      const pctSi = totalEmitidos > 0
        ? Math.round(((votosCamara.afirmativo + votosSenado.afirmativo) / totalEmitidos) * 1000) / 10
        : votosCamara.pctSi || 0;

      const pctNo = totalEmitidos > 0
        ? Math.round(((votosCamara.enContra + votosSenado.enContra) / totalEmitidos) * 1000) / 10
        : votosCamara.pctNo || 0;

      const pctAbst = totalEmitidos > 0
        ? Math.round(((votosCamara.abstencion + votosSenado.abstencion) / totalEmitidos) * 1000) / 10
        : votosCamara.pctAbst || 0;

      const pctNoVota = aparicionesTotales > 0
        ? Math.round(((votosCamara.noVota + votosSenado.noVota) / aparicionesTotales) * 1000) / 10
        : votosCamara.pctNoVota || 0;

      const gastosPorMes: Record<string, number> = {};
      for (const m of gastos.porMes) {
        gastosPorMes[m.periodo] = m.total;
      }

      const polsConGasto = gastos.porPolitico.filter((p) => p.total > 0).length;
      const promedioGasto = polsConGasto > 0 ? Math.round(gastos.total / polsConGasto) : 0;
      const esIndependiente = partido.id.toLowerCase() === "ind";
      const coalicionInfo = COALICION_POR_PARTIDO[normId] || {
        coalicion: esIndependiente ? ("Independientes" as const) : ("Oposición" as const),
        pacto: "Sin pacto declarado",
      };

      return {
        id: partido.id,
        slug: esIndependiente ? "independientes" : partido.sigla.toLowerCase(),
        sigla: partido.sigla,
        nombre: esIndependiente ? "Independientes / Sin partido" : partido.nombre,
        color_hex: partido.color_hex,
        logo_url: partido.logo_url,
        esIndependiente,
        coalicion: coalicionInfo.coalicion,
        pacto: coalicionInfo.pacto,
        diputados: escaños.diputados,
        senadores: escaños.senadores,
        totalEscaños: escaños.total,
        pctEscaños: Math.round((escaños.total / TOTAL_CONGRESO) * 1000) / 10,
        votosCamara,
        votosSenado,
        pctSi,
        pctNo,
        pctAbst,
        pctNoVota,
        asistencia: asistenciaCombinada,
        pctDisciplina: disciplina.pctDisciplina,
        pctRebelion: disciplina.pctRebelion,
        gastosTotal: gastos.total,
        gastosPorMes,
        promedioGastoPorParlamentario: promedioGasto,
        coberturaGastos: `${polsConGasto}/${escaños.total}`,
        personalApoyoTotal: apoyo.totalMensual,
        personalApoyoPersonas: apoyo.totalPersonas,
        personalApoyoPromedio: apoyo.promedioPorParlamentario,
        coberturaPersonal: apoyo.cobertura,
      };
    })
  );

  return res.sort((a, b) => {
    // Independientes al final por defecto o por escaños
    if (a.esIndependiente) return 1;
    if (b.esIndependiente) return -1;
    return b.totalEscaños - a.totalEscaños;
  });
}
