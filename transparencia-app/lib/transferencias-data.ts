import { readFileSync } from "node:fs";
import { join } from "node:path";

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

export function getLey19862Summary(): Ley19862Summary {
  for (const candidate of [
    join(process.cwd(), "data", "generated", "transferencias", "summary.json"),
    join(process.cwd(), "data", "lake", "projections", "v1", "ley19862-summary.json"),
  ]) {
    try {
      const parsed = JSON.parse(readFileSync(candidate, "utf8")) as Ley19862Summary;
      if (parsed.transfers_sample.length >= 1000 || candidate.endsWith("ley19862-summary.json")) return parsed;
    } catch {
      // The generated compact projection is the production path; the source
      // projection keeps local tests and development useful before prebuild.
    }
  }
  {
    return {
      generatedAt: "",
      kpis: { total_monto_clp: 0, total_transfers: 0, total_receptores: 0, total_emisores: 0 },
      by_year: {},
      top_receptores: [],
      top_emisores: [],
      transfers_sample: [],
    };
  }
}
