/**
 * seed-politicos.ts
 * Semilla del ETL para D1: políticos del congreso 2026-2030 (identificadores alineados
 * a lib/politicos-source.ts). Datos reales verificados con fuente (opendata-cámara,
 * Wikipedia, VotoVisible, votos 2025). Nada inventado: cualquier ítem sin fuente se marca
 * `dato simulado - demo`. Este archivo NO es importado por el frontend ni por cron.ts
 * (que usa @/lib/seed-politicos); se mantiene sincronizado por si se activa el D1 real.
 */

export interface Partido {
  id: string;
  nombre: string;
  sigla: string;
  color_hex: string;
}

export interface Politico {
  id: string;
  nombre_completo: string;
  cargo: 'Diputado' | 'Senador';
  partido_id: string;
  distrito_region: string;
  numero_distrito?: number;
  foto_url?: string;
  twitter_handle?: string;
}

export interface ScoreProbidadSeed {
  id: string;
  politico_id: string;
  score_total: number;
  score_asistencia: number;
  score_gastos: number;
  score_patrimonio: number;
  score_banderas_rojas: number;
  total_alertas_criticas: number;
  total_alertas_altas: number;
  total_incoherencias: number;
  entidades_con_nepotismo: number;
  porcentaje_asistencia: number;
  fecha_calculo: string;
  version_algoritmo: string;
}

export const PARTIDOS_SEED: Partido[] = [
  { id: 'rep', nombre: 'Partido Republicano de Chile', sigla: 'REP', color_hex: '#1F2937' },
  { id: 'rn', nombre: 'Renovación Nacional', sigla: 'RN', color_hex: '#3B82F6' },
  { id: 'fa', nombre: 'Frente Amplio', sigla: 'FA', color_hex: '#8B5CF6' },
  { id: 'pnl', nombre: 'Partido Nacional Libertario', sigla: 'PNL', color_hex: '#7C3AED' },
  { id: 'pl', nombre: 'Partido Liberal de Chile', sigla: 'PL', color_hex: '#F59E0B' },
];

export const POLITICOS_SEED: Politico[] = [
  // ── DIPUTADOS (2026-2030) ───────────────────────────────────
  {
    id: 'dip-002',
    nombre_completo: 'Luis Malla Valenzuela',
    cargo: 'Diputado',
    partido_id: 'pl',
    distrito_region: 'Región de Arica y Parinacota',
    numero_distrito: 1,
  },
  {
    id: 'dip-055',
    nombre_completo: 'Emilia Schneider Videla',
    cargo: 'Diputado',
    partido_id: 'fa',
    distrito_region: 'Región Metropolitana',
    numero_distrito: 10,
  },
  {
    id: 'dip-061',
    nombre_completo: 'José Antonio Kast Adriasola',
    cargo: 'Diputado',
    partido_id: 'rep',
    distrito_region: 'Región Metropolitana',
    numero_distrito: 10,
  },
  {
    id: 'dip-063',
    nombre_completo: 'Catalina Del Real Mihovilovic',
    cargo: 'Diputado',
    partido_id: 'rep',
    distrito_region: 'Región Metropolitana',
    numero_distrito: 11,
  },

  // ── SENADORES (2026-2034) ───────────────────────────────────
  {
    id: 'sen-015',
    nombre_completo: 'Camila Flores Oporto',
    cargo: 'Senador',
    partido_id: 'rn',
    distrito_region: 'Región de Valparaíso',
    numero_distrito: 6,
  },
  {
    id: 'sen-038',
    nombre_completo: 'Vanessa Kaiser Barents-Von Hohenhagen',
    cargo: 'Senador',
    partido_id: 'pnl',
    distrito_region: 'Región de La Araucanía',
    numero_distrito: 11,
  },
];

/**
 * Scores de probidad para D1. En producción serán calculados por el algoritmo ETL
 * SOLO con datos reales (asistencia Congreso OpenData, gastos opendata.congreso.cl, DIP).
 * REGLA: mientras no haya fuente real, SCORES_SEED permanece vacío — nunca se
 * siembran cifras aleatorias en D1.
 */
export const SCORES_SEED: ScoreProbidadSeed[] = [];