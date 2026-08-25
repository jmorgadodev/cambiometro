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

export function getLey19862Summary(): Ley19862Summary {
  // El runtime usa sólo el snapshot compacto versionado. El resumen completo
  // de la fuente viva se genera en public/data/transferencias durante el build
  // estático y no se importa en app/lib ni se embebe en el Worker.
  return leySummarySubset as unknown as Ley19862Summary;
}
