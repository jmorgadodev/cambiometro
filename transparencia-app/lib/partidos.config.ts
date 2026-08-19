/**
 * partidos.config.ts — Configuración centralizada e identidad oficial de partidos políticos.
 * Basado en las resoluciones oficiales y registro de partidos del SERVEL.
 */

export interface PartidoConfig {
  id: string;
  sigla: string;
  nombre: string;
  color_oficial: string;
  color_secundario?: string;
  logo_url?: string;
  descripcion?: string;
}

export function generatePartidoSvgBadge(sigla: string, color: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">` +
    `<defs><linearGradient id="g_${sigla}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${color}"/>` +
    `<stop offset="1" stop-color="#0B1220"/>` +
    `</linearGradient></defs>` +
    `<path d="M64 6 L116 20 V70 C116 98 94 116 64 126 C34 116 12 98 12 70 V20 Z" fill="url(#g_${sigla})" stroke="#ffffff55" stroke-width="3"/>` +
    `<path d="M64 6 L116 20 V70 C116 98 94 116 64 126 C34 116 12 98 12 70 V20 Z" fill="none" stroke="#ffffff22" stroke-width="8"/>` +
    `<text x="64" y="80" font-size="${sigla.length > 5 ? '28' : sigla.length > 3 ? '34' : '42'}" font-family="Arial, sans-serif" font-weight="800" fill="#ffffff" text-anchor="middle">${sigla}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const PARTIDOS_CONFIG: Record<string, PartidoConfig> = {
  udi: {
    id: "udi",
    sigla: "UDI",
    nombre: "Unión Demócrata Independiente",
    color_oficial: "#004EA2",
    color_secundario: "#E20613",
    logo_url: "/logos/partidos/udi.svg",
  },
  rn: {
    id: "rn",
    sigla: "RN",
    nombre: "Renovación Nacional",
    color_oficial: "#002F6C",
    color_secundario: "#2563EB",
    logo_url: "/logos/partidos/rn.svg",
  },
  evopoli: {
    id: "evopoli",
    sigla: "EVOPOLI",
    nombre: "Evolución Política",
    color_oficial: "#00B5E2",
    color_secundario: "#3B82F6",
    logo_url: "/logos/partidos/evopoli.svg",
  },
  ps: {
    id: "ps",
    sigla: "PS",
    nombre: "Partido Socialista de Chile",
    color_oficial: "#DC2626",
    color_secundario: "#991B1B",
    logo_url: "/logos/partidos/ps.svg",
  },
  ppd: {
    id: "ppd",
    sigla: "PPD",
    nombre: "Partido por la Democracia",
    color_oficial: "#EA580C",
    color_secundario: "#F97316",
    logo_url: "/logos/partidos/ppd.svg",
  },
  pdc: {
    id: "pdc",
    sigla: "PDC",
    nombre: "Partido Demócrata Cristiano",
    color_oficial: "#003399",
    color_secundario: "#1D4ED8",
    logo_url: "/logos/partidos/pdc.svg",
  },
  fa: {
    id: "fa",
    sigla: "FA",
    nombre: "Frente Amplio",
    color_oficial: "#7C3AED",
    color_secundario: "#6D28D9",
    logo_url: "/logos/partidos/fa.svg",
  },
  pc: {
    id: "pc",
    sigla: "PC",
    nombre: "Partido Comunista de Chile",
    color_oficial: "#B91C1C",
    color_secundario: "#991B1B",
    logo_url: "/logos/partidos/pc.svg",
  },
  rep: {
    id: "rep",
    sigla: "REP",
    nombre: "Partido Republicano de Chile",
    color_oficial: "#0F172A",
    color_secundario: "#1E3A8A",
    logo_url: "/logos/partidos/rep.svg",
  },
  dem: {
    id: "dem",
    sigla: "DEM",
    nombre: "Demócratas",
    color_oficial: "#0284C7",
    color_secundario: "#38BDF8",
    logo_url: "/logos/partidos/dem.svg",
  },
  ama: {
    id: "ama",
    sigla: "AMA",
    nombre: "Amarillos por Chile",
    color_oficial: "#EAB308",
    color_secundario: "#CA8A04",
    logo_url: "/logos/partidos/ama.svg",
  },
  psc: {
    id: "psc",
    sigla: "PSC",
    nombre: "Partido Social Cristiano",
    color_oficial: "#B45309",
    color_secundario: "#D97706",
    logo_url: "/logos/partidos/psc.svg",
  },
  pdg: {
    id: "pdg",
    sigla: "PDG",
    nombre: "Partido de la Gente",
    color_oficial: "#0EA5E9",
    color_secundario: "#0284C7",
    logo_url: "/logos/partidos/pdg.svg",
  },
  pl: {
    id: "pl",
    sigla: "PL",
    nombre: "Partido Liberal de Chile",
    color_oficial: "#F59E0B",
    color_secundario: "#D97706",
    logo_url: "/logos/partidos/pl.svg",
  },
  pr: {
    id: "pr",
    sigla: "PR",
    nombre: "Partido Radical de Chile",
    color_oficial: "#0D9488",
    color_secundario: "#0F766E",
    logo_url: "/logos/partidos/pr.svg",
  },
  frvs: {
    id: "frvs",
    sigla: "FRVS",
    nombre: "Federación Regionalista Verde Social",
    color_oficial: "#059669",
    color_secundario: "#047857",
    logo_url: "/logos/partidos/frvs.svg",
  },
  pnl: {
    id: "pnl",
    sigla: "PNL",
    nombre: "Partido Nacional Libertario",
    color_oficial: "#334155",
    color_secundario: "#475569",
    logo_url: "/logos/partidos/pnl.svg",
  },
  pro: {
    id: "pro",
    sigla: "PRO",
    nombre: "Partido Progresista",
    color_oficial: "#14B8A6",
    color_secundario: "#0D9488",
    logo_url: generatePartidoSvgBadge("PRO", "#14B8A6"),
  },
  ph: {
    id: "ph",
    sigla: "PH",
    nombre: "Partido Humanista",
    color_oficial: "#8B5CF6",
    color_secundario: "#7C3AED",
    logo_url: generatePartidoSvgBadge("PH", "#8B5CF6"),
  },
  pri: {
    id: "pri",
    sigla: "PRI",
    nombre: "Partido Regionalista Independiente",
    color_oficial: "#4D7C0F",
    color_secundario: "#3F6212",
    logo_url: generatePartidoSvgBadge("PRI", "#4D7C0F"),
  },
  ind: {
    id: "ind",
    sigla: "IND",
    nombre: "Independientes / Sin partido",
    color_oficial: "#64748B",
    color_secundario: "#475569",
    logo_url: "/logos/partidos/ind.svg",
  },
};

// Asignar logos por defecto a todas las configuraciones si no estuvieran definidos
Object.keys(PARTIDOS_CONFIG).forEach((id) => {
  const p = PARTIDOS_CONFIG[id];
  if (!p.logo_url) {
    p.logo_url = generatePartidoSvgBadge(p.sigla, p.color_oficial);
  }
});

export function getPartidoConfig(idOrSigla: string): PartidoConfig {
  if (!idOrSigla) {
    return {
      id: "ind",
      sigla: "IND",
      nombre: "Independiente",
      color_oficial: "#64748B",
      logo_url: "/logos/partidos/ind.svg",
    };
  }
  const clean = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const low = clean(idOrSigla);
  if (PARTIDOS_CONFIG[low]) return PARTIDOS_CONFIG[low];

  // Caso especial: Independientes
  if (
    low === "ind" ||
    low === "independiente" ||
    low === "independientes" ||
    low === "sin partido" ||
    low === "fuera de pacto"
  ) {
    return PARTIDOS_CONFIG.ind;
  }

  // Coincidencia exacta por sigla, id o nombre
  const exact = Object.values(PARTIDOS_CONFIG).find(
    (p) =>
      clean(p.sigla) === low ||
      clean(p.id) === low ||
      clean(p.nombre) === low
  );
  if (exact) return exact;

  // Coincidencia por inclusión / alias conocidos (excluyendo ind de la búsqueda por subcadena para no solapar)
  const fuzzy = Object.values(PARTIDOS_CONFIG)
    .filter((p) => p.id !== "ind")
    .find(
      (p) =>
        low.includes(clean(p.sigla)) ||
        low.includes(clean(p.nombre)) ||
        clean(p.nombre).includes(low)
    );
  if (fuzzy) return fuzzy;

  return {
    id: low,
    sigla: idOrSigla.toUpperCase(),
    nombre: idOrSigla,
    color_oficial: "#64748B",
    logo_url: generatePartidoSvgBadge(idOrSigla.toUpperCase(), "#64748B"),
  };
}



export const getPartidoBranding = getPartidoConfig;

