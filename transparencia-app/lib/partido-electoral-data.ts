/**
 * partido-electoral-data.ts
 * Integración y cálculo oficial de resultados electorales SERVEL 2025
 * y comparación histórica vs. 2021 para cada colectividad política.
 */

import { normalizePartidoId } from "@/lib/partido-estadisticas";

export interface RadiografiaElectoral {
  partidoId: string;
  pacto: string;
  pactoLetra?: string;
  coalicion: "Oficialismo" | "Oposición" | "Independientes";
  // 2025
  votosDiputados2025: number;
  pctDiputados2025: number;
  escañosDiputados2025: number;
  votosSenadores2025: number;
  escañosSenadores2025: number;
  totalVotos2025: number;
  totalEscañosElectos2025: number;
  totalEscañosActuales: number;
  // 2021
  pctDiputados2021: number;
  escañosDiputados2021: number;
  // Comparativa (Δ)
  deltaPct: number;
  deltaEscaños: number;
  direccion: "sube" | "baja" | "igual";
  simboloFlecha: "↗" | "↘" | "→";
}

export const COALICION_POR_PARTIDO: Record<string, { coalicion: "Oficialismo" | "Oposición" | "Independientes"; pacto: string }> = {
  udi: { coalicion: "Oposición", pacto: "Chile Grande y Unido" },
  rn: { coalicion: "Oposición", pacto: "Chile Grande y Unido" },
  evopoli: { coalicion: "Oposición", pacto: "Chile Grande y Unido" },
  dem: { coalicion: "Oposición", pacto: "Chile Grande y Unido" },
  ama: { coalicion: "Oposición", pacto: "Chile Grande y Unido" },
  rep: { coalicion: "Oposición", pacto: "Cambio por Chile" },
  pnl: { coalicion: "Oposición", pacto: "Cambio por Chile" },
  psc: { coalicion: "Oposición", pacto: "Cambio por Chile" },
  pdg: { coalicion: "Oposición", pacto: "Partido de la Gente" },
  fa: { coalicion: "Oficialismo", pacto: "Unidad por Chile" },
  ps: { coalicion: "Oficialismo", pacto: "Unidad por Chile" },
  pc: { coalicion: "Oficialismo", pacto: "Unidad por Chile" },
  ppd: { coalicion: "Oficialismo", pacto: "Unidad por Chile" },
  pdc: { coalicion: "Oficialismo", pacto: "Unidad por Chile" },
  pl: { coalicion: "Oficialismo", pacto: "Unidad por Chile" },
  pr: { coalicion: "Oficialismo", pacto: "Unidad por Chile" },
  frvs: { coalicion: "Oficialismo", pacto: "Verdes, Regionalistas y Humanistas" },
  ind: { coalicion: "Independientes", pacto: "Candidaturas Independientes y Fuera de Pacto" },
};

export const DATOS_HISTORICOS_2021: Record<string, { pctDiputados2021: number; escañosDiputados2021: number }> = {
  rn: { pctDiputados2021: 10.96, escañosDiputados2021: 25 },
  udi: { pctDiputados2021: 10.57, escañosDiputados2021: 23 },
  evopoli: { pctDiputados2021: 3.50, escañosDiputados2021: 4 },
  rep: { pctDiputados2021: 10.54, escañosDiputados2021: 14 },
  fa: { pctDiputados2021: 9.94, escañosDiputados2021: 15 },
  ps: { pctDiputados2021: 5.43, escañosDiputados2021: 13 },
  pc: { pctDiputados2021: 7.35, escañosDiputados2021: 12 },
  ppd: { pctDiputados2021: 3.84, escañosDiputados2021: 7 },
  pdc: { pctDiputados2021: 4.18, escañosDiputados2021: 8 },
  pdg: { pctDiputados2021: 8.45, escañosDiputados2021: 6 },
  pl: { pctDiputados2021: 1.40, escañosDiputados2021: 4 },
  pr: { pctDiputados2021: 1.77, escañosDiputados2021: 4 },
  frvs: { pctDiputados2021: 1.64, escañosDiputados2021: 2 },
  dem: { pctDiputados2021: 0.0, escañosDiputados2021: 0 },
  ama: { pctDiputados2021: 0.0, escañosDiputados2021: 0 },
  psc: { pctDiputados2021: 0.0, escañosDiputados2021: 0 },
  pnl: { pctDiputados2021: 0.0, escañosDiputados2021: 0 },
  ind: { pctDiputados2021: 4.80, escañosDiputados2021: 13 },
};

// Datos electorales consolidados 2025 calculados desde proyección SERVEL v1
export const DATOS_SERVEL_2025: Record<string, {
  votosDiputados: number;
  pctDiputados: number;
  escañosDiputados: number;
  votosSenadores: number;
  escañosSenadores: number;
  totalEscañosActuales: number;
}> = {
  udi: { votosDiputados: 894051, pctDiputados: 8.34, escañosDiputados: 18, votosSenadores: 231460, escañosSenadores: 0, totalEscañosActuales: 18 },
  rn: { votosDiputados: 867244, pctDiputados: 8.09, escañosDiputados: 13, votosSenadores: 430806, escañosSenadores: 4, totalEscañosActuales: 17 },
  evopoli: { votosDiputados: 280385, pctDiputados: 2.62, escañosDiputados: 2, votosSenadores: 11238, escañosSenadores: 0, totalEscañosActuales: 2 },
  ps: { votosDiputados: 584963, pctDiputados: 5.46, escañosDiputados: 11, votosSenadores: 222740, escañosSenadores: 3, totalEscañosActuales: 14 },
  ppd: { votosDiputados: 429703, pctDiputados: 4.01, escañosDiputados: 9, votosSenadores: 147261, escañosSenadores: 2, totalEscañosActuales: 11 },
  pdc: { votosDiputados: 454749, pctDiputados: 4.24, escañosDiputados: 8, votosSenadores: 93585, escañosSenadores: 2, totalEscañosActuales: 10 },
  fa: { votosDiputados: 807057, pctDiputados: 7.53, escañosDiputados: 17, votosSenadores: 154787, escañosSenadores: 2, totalEscañosActuales: 19 },
  pc: { votosDiputados: 537230, pctDiputados: 5.01, escañosDiputados: 11, votosSenadores: 257932, escañosSenadores: 1, totalEscañosActuales: 12 },
  rep: { votosDiputados: 1421931, pctDiputados: 13.26, escañosDiputados: 31, votosSenadores: 533732, escañosSenadores: 5, totalEscañosActuales: 36 },
  dem: { votosDiputados: 213331, pctDiputados: 1.99, escañosDiputados: 1, votosSenadores: 78229, escañosSenadores: 1, totalEscañosActuales: 2 },
  ama: { votosDiputados: 88352, pctDiputados: 0.82, escañosDiputados: 0, votosSenadores: 0, escañosSenadores: 0, totalEscañosActuales: 0 },
  psc: { votosDiputados: 363974, pctDiputados: 3.39, escañosDiputados: 3, votosSenadores: 80876, escañosSenadores: 0, totalEscañosActuales: 3 },
  pdg: { votosDiputados: 1286540, pctDiputados: 12.00, escañosDiputados: 14, votosSenadores: 326050, escañosSenadores: 0, totalEscañosActuales: 14 },
  pl: { votosDiputados: 236924, pctDiputados: 2.21, escañosDiputados: 3, votosSenadores: 74994, escañosSenadores: 1, totalEscañosActuales: 4 },
  pr: { votosDiputados: 225603, pctDiputados: 2.10, escañosDiputados: 2, votosSenadores: 45540, escañosSenadores: 0, totalEscañosActuales: 2 },
  frvs: { votosDiputados: 460896, pctDiputados: 4.30, escañosDiputados: 2, votosSenadores: 80438, escañosSenadores: 1, totalEscañosActuales: 3 },
  pnl: { votosDiputados: 679840, pctDiputados: 6.34, escañosDiputados: 8, votosSenadores: 171638, escañosSenadores: 1, totalEscañosActuales: 9 },
  ind: { votosDiputados: 967467, pctDiputados: 9.02, escañosDiputados: 19, votosSenadores: 65262, escañosSenadores: 0, totalEscañosActuales: 19 },
};

export function getRadiografiaElectoral(partidoId: string): RadiografiaElectoral {
  const normId = normalizePartidoId(partidoId);
  const infoCoalicion = COALICION_POR_PARTIDO[normId] || {
    coalicion: "Independientes" as const,
    pacto: "Independientes / Fuera de Pacto",
  };

  const s2025 = DATOS_SERVEL_2025[normId] || {
    votosDiputados: 0,
    pctDiputados: 0,
    escañosDiputados: 0,
    votosSenadores: 0,
    escañosSenadores: 0,
    totalEscañosActuales: 0,
  };

  const h2021 = DATOS_HISTORICOS_2021[normId] || {
    pctDiputados2021: 0,
    escañosDiputados2021: 0,
  };

  const deltaPct = Math.round((s2025.pctDiputados - h2021.pctDiputados2021) * 100) / 100;
  const deltaEscaños = s2025.escañosDiputados - h2021.escañosDiputados2021;

  let direccion: "sube" | "baja" | "igual" = "igual";
  let simboloFlecha: "↗" | "↘" | "→" = "→";

  if (deltaPct > 0.05) {
    direccion = "sube";
    simboloFlecha = "↗";
  } else if (deltaPct < -0.05) {
    direccion = "baja";
    simboloFlecha = "↘";
  }

  return {
    partidoId: normId,
    pacto: infoCoalicion.pacto,
    coalicion: infoCoalicion.coalicion,
    votosDiputados2025: s2025.votosDiputados,
    pctDiputados2025: s2025.pctDiputados,
    escañosDiputados2025: s2025.escañosDiputados,
    votosSenadores2025: s2025.votosSenadores,
    escañosSenadores2025: s2025.escañosSenadores,
    totalVotos2025: s2025.votosDiputados + s2025.votosSenadores,
    totalEscañosElectos2025: s2025.escañosDiputados + s2025.escañosSenadores,
    totalEscañosActuales: s2025.totalEscañosActuales,
    pctDiputados2021: h2021.pctDiputados2021,
    escañosDiputados2021: h2021.escañosDiputados2021,
    deltaPct,
    deltaEscaños,
    direccion,
    simboloFlecha,
  };
}
