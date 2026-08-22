// trigger CI for docs perf metrics - 2026-08-22
import globalKpisRaw from "./global-kpis.json";

export interface GlobalKpis {
  registros_canonicos: number;
  entidades: number;
  relaciones: number;
  votaciones: number;
  gastos: number;
  fuentes_operativas: number;
  total_fuentes: number;
  corte: string;
  generatedAt: string;
}

export const GLOBAL_KPIS: GlobalKpis = globalKpisRaw as GlobalKpis;

export const KPI_SCOPES: Record<keyof Omit<GlobalKpis, "corte" | "generatedAt">, { label: string; tooltip: string; href: string }> = {
  registros_canonicos: {
    label: "registros oficiales",
    tooltip: "Total consolidado de actos administrativos, contratos, asistencias, dietas y resoluciones públicas indexadas.",
    href: "/datos",
  },
  entidades: {
    label: "entidades identificadas",
    tooltip: "Organismos públicos, ministerios, municipalidades, parlamentarios, partidos y proveedores catalogados con RUT o identificador oficial.",
    href: "/entidades",
  },
  relaciones: {
    label: "relaciones y cruces",
    tooltip: "Vínculos documentales cruzados y auditables entre entidades respaldados por evidencia directa.",
    href: "/cruces",
  },
  votaciones: {
    label: "votaciones de sala",
    tooltip: "Votaciones nominales de proyectos de ley y acuerdos de sala registrados en la Cámara y el Senado.",
    href: "/politico",
  },
  gastos: {
    label: "gastos parlamentarios",
    tooltip: "Registros detallados de gastos operacionales, viáticos y personal de apoyo del Congreso Nacional.",
    href: "/partidos",
  },
  fuentes_operativas: {
    label: "fuentes operativas",
    tooltip: "Pipelines de extracción y validación de datos públicos del Estado chileno funcionando en tiempo real.",
    href: "/datos",
  },
  total_fuentes: {
    label: "total de fuentes",
    tooltip: "Universo total de fuentes oficiales conectadas a la plataforma.",
    href: "/datos",
  },
};

export function getGlobalKpis(): GlobalKpis {
  return GLOBAL_KPIS;
}
