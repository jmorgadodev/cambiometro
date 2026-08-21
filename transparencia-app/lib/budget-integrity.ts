export type BudgetIntegrityEvaluation =
  | { status: "FUENTE_NO_DISPONIBLE"; validation: "V7"; source_anomaly: false; difference: null }
  | { status: "OK" | "ALTA"; validation: "V7"; source_anomaly: boolean; difference: number };

export function evaluateBudgetSourceAnomaly({
  ejecutado,
  vigente,
}: {
  ejecutado: number | null | undefined;
  vigente: number | null | undefined;
}): BudgetIntegrityEvaluation {
  if (ejecutado === null || ejecutado === undefined || vigente === null || vigente === undefined) {
    return { status: "FUENTE_NO_DISPONIBLE", validation: "V7", source_anomaly: false, difference: null };
  }
  const difference = Number(ejecutado) - Number(vigente);
  return {
    status: difference > 0 ? "ALTA" : "OK",
    validation: "V7",
    source_anomaly: difference > 0,
    difference,
  };
}
