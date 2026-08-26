export const BASELINE_TRANSFER_ROWS = 59_361;
export const BASELINE_TRANSFER_AMOUNT_CLP = 5_011_094_170_302;

export function buildTransferCoverageRow({ totalRows, totalMontoClp }) {
  const rows = Number(totalRows);
  const amount = Number(totalMontoClp);
  const pass = Number.isSafeInteger(rows)
    && rows >= BASELINE_TRANSFER_ROWS
    && Number.isSafeInteger(amount)
    && amount > 0;
  return {
    modulo: "Transferencias Ley 19.862",
    indexado: `${Number.isFinite(rows) ? rows.toLocaleString("es-CL") : "?"} registros ($${Number.isFinite(amount) ? (amount / 1_000_000_000_000).toFixed(2) : "?"} billones)`,
    universo: `≥ ${BASELINE_TRANSFER_ROWS.toLocaleString("es-CL")} manifest`,
    cobertura: Number.isFinite(rows) ? `${((rows / BASELINE_TRANSFER_ROWS) * 100).toFixed(1)}%` : "0.0%",
    umbral: `≥ ${BASELINE_TRANSFER_ROWS.toLocaleString("es-CL")}`,
    estado: pass ? "PASS" : "FAIL",
    nota: `registros19862.gob.cl; baseline ${BASELINE_TRANSFER_ROWS.toLocaleString("es-CL")} / $${BASELINE_TRANSFER_AMOUNT_CLP.toLocaleString("es-CL")}`,
    pass,
  };
}
