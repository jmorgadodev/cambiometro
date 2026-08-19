import leySummaryRaw from "@/data/lake/projections/v1/ley19862-summary.json";

export interface ReceptorResumen {
  name: string;
  rut: string;
  class: string;
  total_clp: number;
  count: number;
  top_emisores: string[];
}

export interface EmisorResumen {
  name: string;
  rut: string;
  class: string;
  total_clp: number;
  count: number;
}

export interface TransferenciaDetalle {
  id: string;
  fecha: string;
  period: string;
  title: string;
  description: string;
  classification?: string;
  emitter_name?: string;
  emitter_rut?: string;
  receiver_name?: string;
  receiver_rut?: string;
  monto_clp: number;
  url?: string;
  municipality?: string;
}

export interface Ley19862Summary {
  generatedAt: string;
  kpis: {
    total_monto_clp: number;
    total_transfers: number;
    total_receptores: number;
    total_emisores: number;
  };
  top_receptores: ReceptorResumen[];
  top_emisores: EmisorResumen[];
  transfers_sample: TransferenciaDetalle[];
}

export function getLey19862Summary(): Ley19862Summary {
  return leySummaryRaw as unknown as Ley19862Summary;
}
