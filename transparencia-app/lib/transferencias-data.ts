import fs from "fs";
import path from "path";
import leySummarySubset from "@/data/lake-subsets/ley19862.subset.json";

export interface ReceptorResumen {
  name: string;
  rut: string;
  class: string | null;
  total_clp: number;
  count: number;
  top_emisores: string[];
}

export interface EmisorResumen {
  name: string;
  rut: string;
  class: string | null;
  total_clp: number;
  count: number;
}

export interface TransferenciaDetalle {
  id: string;
  fecha: string | null;
  period: string | null;
  title: string | null;
  description: string | null;
  classification: string | null;
  emitter_name: string | null;
  emitter_rut: string | null;
  receiver_name: string | null;
  receiver_rut: string | null;
  monto_clp: number;
  url: string | null;
  municipality: string | null;
}

export interface Ley19862Summary {
  generatedAt: string;
  kpis: {
    total_monto_clp: number;
    total_transfers: number;
    total_receptores: number;
    total_emisores: number;
  };
  by_year: Record<string, { count: number; total: number }>;
  top_receptores: ReceptorResumen[];
  top_emisores: EmisorResumen[];
  transfers_sample: TransferenciaDetalle[];
}

let cachedLeySummary: Ley19862Summary | null = null;

export function getLey19862Summary(): Ley19862Summary {
  if (cachedLeySummary) return cachedLeySummary;
  try {
    const fullPath = path.join(process.cwd(), "data", "lake", "projections", "v1", "ley19862-summary.json");
    if (fs.existsSync(fullPath)) {
      cachedLeySummary = JSON.parse(fs.readFileSync(fullPath, "utf8")) as Ley19862Summary;
      return cachedLeySummary;
    }
  } catch {}
  cachedLeySummary = leySummarySubset as unknown as Ley19862Summary;
  return cachedLeySummary;
}
