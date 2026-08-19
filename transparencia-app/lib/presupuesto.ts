import fs from "fs";
import path from "path";
import presupuestoStaticJson from "@/data/lake/projections/v1/presupuesto.json";

export interface PresupuestoSubtitulo {
  subtitulo: string;
  denominacion: string;
  inicial: number;
  vigente: number;
  ejecutado: number;
}

export interface PresupuestoMes {
  period: string;
  inicial: number;
  vigente: number;
  ejecutado: number;
}

export interface PresupuestoPrograma {
  programId: string;
  partida: string;
  capitulo: string;
  programa: string;
  budgetSide: string;
  meses: PresupuestoMes[];
  subtitulos: PresupuestoSubtitulo[];
}

export interface PresupuestoProyeccion {
  generatedAt: string;
  period: string;
  count: number;
  programs: PresupuestoPrograma[];
}

let cached: PresupuestoProyeccion | null = null;

export function leerPresupuestoV1(): PresupuestoProyeccion | null {
  if (cached) return cached;
  try {
    const file = path.join(
      process.cwd(),
      "data",
      "lake",
      "projections",
      "v1",
      "presupuesto.json"
    );
    if (fs.existsSync(file)) {
      cached = JSON.parse(fs.readFileSync(file, "utf8")) as PresupuestoProyeccion;
      return cached;
    }
  } catch {}
  cached = (presupuestoStaticJson as unknown) as PresupuestoProyeccion;
  return cached;
}

export function presupuestoParaPrograma(programId: string): PresupuestoPrograma | null {
  return leerPresupuestoV1()?.programs.find((program) => program.programId === programId) ?? null;
}

export interface PresupuestoEspecificoConfig {
  partida: string;
  capitulo?: string;
  programa?: string;
}

/**
 * Mapeo oficial Ley de Presupuesto 2026 → partida / capítulo / programa DIPRES
 * Fuente: Ley Nº 21.748, Ley de Presupuestos del Sector Público 2026.
 */
export const PRESUPUESTO_CONFIG_POR_SERVICIO: Record<string, PresupuestoEspecificoConfig> = {
  // ── MINISTERIOS DE ESTADO (Partidas 01 a 26) ──
  "min-segpres": { partida: "1" },
  "min-segegob": { partida: "6" },
  "min-interior": { partida: "2" },
  "min-seguridad": { partida: "2" },
  "min-rrhh": { partida: "3" },
  "min-defensa": { partida: "4" },
  "min-hacienda": { partida: "5" },
  "min-justicia": { partida: "7" },
  "min-trabajo": { partida: "8" },
  "min-educacion": { partida: "9" },
  "min-salud": { partida: "11" },
  "min-mop": { partida: "12" },
  "min-agricultura": { partida: "13" },
  "min-bienesnacionales": { partida: "14" },
  "min-economia": { partida: "15" },
  "min-desarrollosocial": { partida: "16" },
  "min-mineria": { partida: "17" },
  "min-mtt": { partida: "18" },
  "min-minvu": { partida: "19" },
  "min-minmujeryeg": { partida: "21" },
  "min-mindep": { partida: "22" },
  "min-mma": { partida: "23" },
  "min-energia": { partida: "24" },
  "min-ciencia": { partida: "25" },
  "min-cultura": { partida: "26" },

  // ── GOBIERNOS REGIONALES (Partida 31 - Programas 3 al 18) ──
  "gore-arica": { partida: "31", programa: "3" },
  "gore-tarapaca": { partida: "31", programa: "4" },
  "gore-antofagasta": { partida: "31", programa: "5" },
  "gore-atacama": { partida: "31", programa: "6" },
  "gore-coquimbo": { partida: "31", programa: "7" },
  "gore-valparaiso": { partida: "31", programa: "8" },
  "gore-ohiggins": { partida: "31", programa: "9" },
  "gore-maule": { partida: "31", programa: "10" },
  "gore-nuble": { partida: "31", programa: "11" },
  "gore-biobio": { partida: "31", programa: "12" },
  "gore-araucania": { partida: "31", programa: "13" },
  "gore-losrios": { partida: "31", programa: "14" },
  "gore-loslagos": { partida: "31", programa: "15" },
  "gore-aysen": { partida: "31", programa: "16" },
  "gore-magallanes": { partida: "31", programa: "17" },
  "gore-rm": { partida: "31", programa: "18" },

  // ── SERVICIOS NACIONALES Y SUPERINTENDENCIAS ──
  "serv-sag": { partida: "13", capitulo: "2" },
  "serv-indap": { partida: "13", capitulo: "3" },
  "serv-conaf": { partida: "13", capitulo: "4" },
  "serv-sii": { partida: "5", capitulo: "4" },
  "serv-tgr": { partida: "5", capitulo: "5" },
  "serv-aduanas": { partida: "5", capitulo: "7" },
  "serv-fonasa": { partida: "11", capitulo: "2" },
  "serv-dt": { partida: "8", capitulo: "2" },
  "serv-ips": { partida: "8", capitulo: "3" },
  "serv-sence": { partida: "8", capitulo: "4" },
  "serv-registro-civil": { partida: "7", capitulo: "3" },
  "serv-senapred": { partida: "2", capitulo: "4" },
  "serv-serviu-rm": { partida: "19", capitulo: "2" },
  "serv-corfo": { partida: "15", capitulo: "2" },
  "serv-sernac": { partida: "15", capitulo: "3" },
  "super-cmf": { partida: "5", capitulo: "9" },
  "super-salud": { partida: "11", capitulo: "4" },
  "super-pensiones": { partida: "8", capitulo: "5" },
  "super-sec": { partida: "24", capitulo: "2" },
  "super-sma": { partida: "23", capitulo: "2" },
  "super-educacion": { partida: "9", capitulo: "4" },

  // ── EMPRESAS PÚBLICAS ──
  "emp-codelco": { partida: "17" },
  "emp-enami": { partida: "17" },
  "emp-enap": { partida: "24" },
  "emp-bancoestado": { partida: "5" },
  "emp-efe": { partida: "18" },
  "emp-metro": { partida: "18" },
  "emp-tvn": { partida: "6" },
};

export const PARTIDA_POR_SERVICIO: Record<string, string> = Object.fromEntries(
  Object.entries(PRESUPUESTO_CONFIG_POR_SERVICIO).map(([k, v]) => [k, v.partida])
);

export interface MesGastoPresupuesto {
  period: string;
  vigente: number;
  ejecutado: number;
  devengadoMes: number;
}

export interface ResumenPresupuesto {
  period: string;
  partida: string;
  capitulo?: string;
  programa?: string;
  inicial_ley_clp: number;
  vigente_clp: number;
  ejecutado_clp: number;
  saldo_disponible_clp: number;
  porcentaje_ejecucion: number;
  meses_disponibles: number;
  ultimo_periodo: string | null;
  fuente_url: string;
  programas_count?: number;
  desglose_mensual: MesGastoPresupuesto[];
  subtitulos?: PresupuestoSubtitulo[];
}

/**
 * Retorna el resumen presupuestario agregado de la partida/programa/capítulo
 * correspondiente al ID de servicio en SERVICIOS_PUBLICOS_SEED.
 */
export function presupuestoParaServicio(servicioId: string): ResumenPresupuesto | null {
  const cfg = PRESUPUESTO_CONFIG_POR_SERVICIO[servicioId];
  if (!cfg) return null;
  const proyeccion = leerPresupuestoV1();
  if (!proyeccion) return null;

  let programas = proyeccion.programs.filter((p) => p.partida === cfg.partida);
  if (cfg.capitulo) {
    const byCap = programas.filter((p) => p.capitulo === cfg.capitulo);
    if (byCap.length > 0) programas = byCap;
  }
  if (cfg.programa) {
    const byProg = programas.filter((p) => p.programa === cfg.programa);
    if (byProg.length > 0) programas = byProg;
  }
  if (programas.length === 0) return null;

  let inicialLey = 0;
  let vigente = 0;
  let ejecutado = 0;
  const periodos = new Set<string>();
  const subtitulosMap = new Map<string, PresupuestoSubtitulo>();

  for (const prog of programas) {
    const firstMes = [...prog.meses].sort((a, b) => a.period.localeCompare(b.period))[0];
    if (firstMes) inicialLey += firstMes.inicial;
    const lastMes = [...prog.meses].sort((a, b) => a.period.localeCompare(b.period)).at(-1);
    if (lastMes) {
      vigente += lastMes.vigente;
      ejecutado += lastMes.ejecutado;
    }
    for (const m of prog.meses) {
      periodos.add(m.period);
    }
    for (const sub of prog.subtitulos || []) {
      const existing = subtitulosMap.get(sub.subtitulo);
      if (existing) {
        existing.inicial += sub.inicial || 0;
        existing.vigente += sub.vigente || 0;
        existing.ejecutado += sub.ejecutado || 0;
      } else {
        subtitulosMap.set(sub.subtitulo, {
          subtitulo: sub.subtitulo,
          denominacion: sub.denominacion,
          inicial: sub.inicial || 0,
          vigente: sub.vigente || 0,
          ejecutado: sub.ejecutado || 0,
        });
      }
    }
  }

  // Desglose mensual agregado para gráficos
  const periodosSorted = [...periodos].sort();
  const desglose_mensual: MesGastoPresupuesto[] = [];
  let prevEjecutado = 0;

  for (const p of periodosSorted) {
    let sumVig = 0;
    let sumEj = 0;
    for (const prog of programas) {
      const m = prog.meses.find((item) => item.period === p);
      if (m) {
        sumVig += m.vigente;
        sumEj += m.ejecutado;
      }
    }
    const devengadoMes = Math.max(0, sumEj - prevEjecutado);
    desglose_mensual.push({
      period: p,
      vigente: sumVig,
      ejecutado: sumEj,
      devengadoMes,
    });
    prevEjecutado = sumEj;
  }

  const saldo_disponible_clp = Math.max(0, vigente - ejecutado);
  const porcentaje_ejecucion = vigente > 0 ? Number(((ejecutado / vigente) * 100).toFixed(1)) : 0;
  const subtitulos = Array.from(subtitulosMap.values()).sort((a, b) => Number(a.subtitulo) - Number(b.subtitulo));

  return {
    period: proyeccion.period,
    partida: cfg.partida,
    capitulo: cfg.capitulo,
    programa: cfg.programa,
    inicial_ley_clp: inicialLey,
    vigente_clp: vigente,
    ejecutado_clp: ejecutado,
    saldo_disponible_clp,
    porcentaje_ejecucion,
    meses_disponibles: periodos.size,
    ultimo_periodo: periodosSorted.at(-1) ?? null,
    fuente_url: "https://www.dipres.gob.cl/597/w3-multipropertyvalues-25910-37782.html",
    programas_count: programas.length,
    desglose_mensual,
    subtitulos,
  };
}

export function getPresupuestoNacionalTotales() {
  const proyeccion = leerPresupuestoV1();
  if (!proyeccion) return { inicialLey: 0, vigente: 0, ejecutado: 0, count: 0 };
  let inicial = 0;
  let vigente = 0;
  let ejecutado = 0;
  for (const prog of proyeccion.programs) {
    const firstMes = [...prog.meses].sort((a, b) => a.period.localeCompare(b.period))[0];
    if (firstMes) inicial += firstMes.inicial;
    const lastMes = [...prog.meses].sort((a, b) => a.period.localeCompare(b.period)).at(-1);
    if (lastMes) {
      vigente += lastMes.vigente;
      ejecutado += lastMes.ejecutado;
    }
  }
  return {
    inicialLey: inicial,
    vigente,
    ejecutado,
    count: proyeccion.count,
  };
}