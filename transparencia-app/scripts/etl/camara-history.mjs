import { resolveIncrementalFrom } from "./incremental-window.mjs";

export const CAMARA_CURRENT_PERIOD_START = "2026-03-11";

/**
 * Resuelve la ventana de votaciones de Cámara sin permitir que una ejecución
 * incremental se confunda con una reconstrucción histórica explícita.
 */
export function resolveCamaraVoteWindow({
  requestedFrom,
  previousRecords = [],
  fullHistory = false,
  overlapDays = 7,
}) {
  if (fullHistory) {
    return { from: requestedFrom, minimumFrom: requestedFrom };
  }
  return {
    from: resolveIncrementalFrom({
      requestedFrom,
      minimumFrom: CAMARA_CURRENT_PERIOD_START,
      previousRecords,
      overlapDays,
    }),
    minimumFrom: CAMARA_CURRENT_PERIOD_START,
  };
}
