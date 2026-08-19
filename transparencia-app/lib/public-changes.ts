export interface CambioPublico {
  id: string;
  tipo: "critica" | "alta" | "warn" | "info";
  politico: string;
  politicoId: string;
  cargo: string;
  descripcion: string;
  fechaIso: string;
  partidoId?: string;
  votos2025: number;
  porcentajeVotos: number;
}

export const CAMBIOS_VERIFICADOS: CambioPublico[] = [
  {
    id: "c1",
    tipo: "info",
    politico: "José Antonio Kast Adriasola",
    politicoId: "dip-061",
    cargo: "Diputado",
    descripcion: "Inicia su período por el distrito 10 de la Región Metropolitana, electo en 2025 con 57.245 votos (8,78%).",
    fechaIso: "2026-03-11",
    partidoId: "rep",
    votos2025: 57245,
    porcentajeVotos: 8.78,
  },
  {
    id: "c2",
    tipo: "info",
    politico: "Camila Flores Oporto",
    politicoId: "sen-015",
    cargo: "Senadora",
    descripcion: "Inicia su período por la circunscripción 6 de Valparaíso, electa en 2025 con 87.994 votos (7,50%).",
    fechaIso: "2026-03-11",
    partidoId: "rn",
    votos2025: 87994,
    porcentajeVotos: 7.5,
  },
  {
    id: "c3",
    tipo: "info",
    politico: "Emilia Schneider Videla",
    politicoId: "dip-055",
    cargo: "Diputada",
    descripcion: "Asume por el distrito 10 de la Región Metropolitana, reelecta en 2025 con 31.365 votos (4,81%).",
    fechaIso: "2026-03-11",
    partidoId: "fa",
    votos2025: 31365,
    porcentajeVotos: 4.81,
  },
  {
    id: "c4",
    tipo: "info",
    politico: "Catalina Del Real Mihovilovic",
    politicoId: "dip-063",
    cargo: "Diputada",
    descripcion: "Reelecta por el distrito 11 de la Región Metropolitana, ahora por el Partido Republicano, con 57.641 votos (10,78%).",
    fechaIso: "2026-03-11",
    partidoId: "rep",
    votos2025: 57641,
    porcentajeVotos: 10.78,
  },
  {
    id: "c5",
    tipo: "info",
    politico: "Vanessa Kaiser Barents-Von Hohenhagen",
    politicoId: "sen-038",
    cargo: "Senadora",
    descripcion: "Asume por la circunscripción 11 de La Araucanía, electa por el Partido Nacional Libertario con 58.326 votos (8,91%).",
    fechaIso: "2026-03-11",
    partidoId: "pnl",
    votos2025: 58326,
    porcentajeVotos: 8.91,
  },
];

import { getPoliticoSlug } from "./politico-slugs";

export function getPoliticoPath(politicoId: string): string {
  return `/politico/${encodeURIComponent(getPoliticoSlug(politicoId))}`;
}

export function formatPublicDate(fechaIso: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${fechaIso}T00:00:00Z`));
}
