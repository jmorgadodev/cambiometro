export interface SenadoAssignmentPolicy {
  year: number;
  base_mensual_clp: number;
  acumulable: boolean;
  max_transfer_gastos_operacionales_pct: number;
  max_transfer_asesoria_externa_clp: number;
  transfer_asesoria_desde: string;
}

export interface VerifiedSenateTransfer {
  period: string;
  amount_clp: number;
  source_url: string;
  checksum_sha256: string;
}

export interface SenateSupportEvaluation {
  status: "OK" | "ALTA" | "CRITICA";
  period: string;
  base_mensual_clp: number;
  total_clp: number;
  excess_clp: number;
  verified_transfer_clp: number;
  unexplained_clp: number;
  unexplained_pct_base: number;
}

export function parseSenadoAssignmentPolicy(html: string): SenadoAssignmentPolicy;
export function evaluateSenateSupport(input: {
  total_clp: number;
  period: string;
  base_mensual_clp: number;
  verified_transfers?: VerifiedSenateTransfer[];
}): SenateSupportEvaluation;
