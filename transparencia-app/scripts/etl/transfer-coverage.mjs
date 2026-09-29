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
    modulo: "Transferencias Ley 19.862 (release)",
    indexado: `${Number.isFinite(rows) ? rows.toLocaleString("es-CL") : "?"} registros ($${Number.isFinite(amount) ? (amount / 1_000_000_000_000).toFixed(2) : "?"} billones)`,
    universo: "Release publicado; universo oficial no medido",
    cobertura: "No medida",
    umbral: `release ≥ baseline ${BASELINE_TRANSFER_ROWS.toLocaleString("es-CL")}`,
    estado: pass ? "CHECKED" : "FAIL",
    nota: `registros19862.gob.cl; baseline de regresión ${BASELINE_TRANSFER_ROWS.toLocaleString("es-CL")} / $${BASELINE_TRANSFER_AMOUNT_CLP.toLocaleString("es-CL")}; no es denominador oficial`,
    pass,
    measured: false,
  };
}
