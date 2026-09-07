import type { MunicipalidadListItem } from "@/lib/municipalidades-list";

export type MunicipalMapMetric =
  | "population"
  | "budget"
  | "perCapita"
  | "fcm"
  | "staff"
  | "purchases";

export interface MunicipalMapPurchaseMetric {
  procesos: number | null;
}

export interface MunicipalMapMetricOption {
  id: MunicipalMapMetric;
  label: string;
  shortLabel: string;
  unit: "number" | "currency" | "percent";
  description: string;
}

export const MUNICIPAL_MAP_METRICS: readonly MunicipalMapMetricOption[] = [
  {
    id: "population",
    label: "Población Censo 2024",
    shortLabel: "Población",
    unit: "number",
    description: "Personas registradas en el Censo 2024.",
  },
  {
    id: "budget",
    label: "Presupuesto vigente",
    shortLabel: "Presupuesto",
    unit: "currency",
    description: "Presupuesto municipal vigente publicado.",
  },
  {
    id: "perCapita",
    label: "Presupuesto per cápita",
    shortLabel: "Per cápita",
    unit: "currency",
    description: "Presupuesto vigente dividido por población Censo 2024.",
  },
  {
    id: "fcm",
    label: "Dependencia del FCM",
    shortLabel: "FCM",
    unit: "percent",
    description: "Porcentaje de dependencia del Fondo Común Municipal.",
  },
  {
    id: "staff",
    label: "Funcionarios registrados",
    shortLabel: "Funcionarios",
    unit: "number",
    description: "Dotación incluida en el resumen de nómina publicado.",
  },
  {
    id: "purchases",
    label: "Procesos de compra",
    shortLabel: "Compras",
    unit: "number",
    description: "Procesos de compra municipal disponibles en el release.",
  },
];

export function getMunicipalMapMetric(
  municipality: MunicipalidadListItem,
  metric: MunicipalMapMetric,
  purchases?: MunicipalMapPurchaseMetric | null,
): number | null {
  switch (metric) {
    case "population":
      return municipality.poblacion_censo_2024;
    case "budget":
      return municipality.presupuesto?.vigente_clp ?? null;
    case "perCapita":
      return municipality.presupuesto_per_capita_clp ?? null;
    case "fcm":
      return municipality.fcm_dependencia_pct ?? null;
    case "staff":
      return municipality.resumen_personal?.total_funcionarios ?? null;
    case "purchases":
      return purchases?.procesos ?? null;
  }
}

export function normalizeRegionName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^Region de /i, "")
    .replace(/^Region del /i, "")
    .replace(/^Region de la /i, "")
    .replace(/^Region Metropolitana de /i, "")
    .trim()
    .toLowerCase();
}

export function regionMatches(left: string, right: string): boolean {
  return normalizeRegionName(left) === normalizeRegionName(right);
}

export function formatMunicipalMapValue(value: number | null, unit: MunicipalMapMetricOption["unit"]): string {
  if (value === null || !Number.isFinite(value)) return "Sin dato publicado";
  if (unit === "currency") {
    return `$${Math.round(value).toLocaleString("es-CL")}`;
  }
  if (unit === "percent") {
    return `${value.toLocaleString("es-CL", { maximumFractionDigits: 1 })}%`;
  }
  return Math.round(value).toLocaleString("es-CL");
}

export function aggregateMunicipalMapMetric(
  municipalities: readonly MunicipalidadListItem[],
  metric: MunicipalMapMetric,
  purchasesById: Readonly<Record<string, MunicipalMapPurchaseMetric | null>> = {},
): number | null {
  const rows = municipalities
    .map((municipality) => ({
      municipality,
      value: getMunicipalMapMetric(municipality, metric, purchasesById[municipality.id]),
    }))
    .filter((row): row is { municipality: MunicipalidadListItem; value: number } => row.value !== null && Number.isFinite(row.value));

  if (rows.length === 0) return null;
  if (metric === "fcm") {
    const weighted = rows.reduce((sum, row) => {
      const population = row.municipality.poblacion_censo_2024 ?? 0;
      return { value: sum.value + row.value * population, weight: sum.weight + population };
    }, { value: 0, weight: 0 });
    return weighted.weight > 0
      ? weighted.value / weighted.weight
      : rows.reduce((sum, row) => sum + row.value, 0) / rows.length;
  }
  if (metric === "perCapita") {
    const budget = aggregateMunicipalMapMetric(municipalities, "budget", purchasesById);
    const population = aggregateMunicipalMapMetric(municipalities, "population", purchasesById);
    return budget !== null && population ? budget / population : null;
  }
  return rows.reduce((sum, row) => sum + row.value, 0);
}
