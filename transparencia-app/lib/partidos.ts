import { PARTIDOS_CONFIG, getPartidoConfig, generatePartidoSvgBadge, type PartidoConfig } from "./partidos.config";

export interface Partido {
  id: string;
  nombre: string;
  sigla: string;
  color_hex: string;
  logo_url?: string;
}

export function logoParaPartido(partido: Partido): string {
  return partido.logo_url || generatePartidoSvgBadge(partido.sigla, partido.color_hex);
}

export const PARTIDOS_SEED: Partido[] = Object.values(PARTIDOS_CONFIG).map((cfg) => ({
  id: cfg.id,
  nombre: cfg.nombre,
  sigla: cfg.sigla,
  color_hex: cfg.color_oficial,
  logo_url: cfg.logo_url || generatePartidoSvgBadge(cfg.sigla, cfg.color_oficial),
}));

export const PARTIDO_FALLBACK: Partido = {
  id: "ind",
  nombre: "Independientes",
  sigla: "IND",
  color_hex: "#64748B",
  logo_url: "/logos/partidos/ind.svg",
};



export { getPartidoConfig, generatePartidoSvgBadge, type PartidoConfig };