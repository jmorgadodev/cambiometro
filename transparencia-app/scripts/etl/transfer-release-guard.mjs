export const CANONICAL_MIN_TRANSFER_ROWS = 59_361;
export const CANONICAL_MIN_TRANSFER_TOTAL_CLP = 5_011_094_170_302;
// Baseline histórico usado por fixtures y cobertura. Los releases oficiales
// pueden crecer cuando el ETL incorpora nuevos registros; no se deben recortar
// para conservar esta cifra.
export const CANONICAL_TRANSFER_ROWS = 59_361;
export const CANONICAL_TRANSFER_TOTAL_CLP = 5_011_094_170_302;

export function assertMinimumTransferRows(totalRows, minimum = CANONICAL_MIN_TRANSFER_ROWS) {
  if (!Number.isInteger(totalRows) || totalRows < minimum) {
    throw new Error(`TRANSFER_RELEASE_INCOMPLETE: totalRows=${totalRows} < minimum=${minimum}`);
  }
  return totalRows;
}

export function assertCanonicalTransferRelease({ totalRows, totalMontoClp }) {
  if (!Number.isInteger(totalRows) || totalRows < CANONICAL_MIN_TRANSFER_ROWS) {
    throw new Error(`TRANSFER_RELEASE_INCOMPLETE: totalRows=${totalRows} < minimum=${CANONICAL_MIN_TRANSFER_ROWS}`);
  }
  if (!Number.isSafeInteger(totalMontoClp) || totalMontoClp < CANONICAL_MIN_TRANSFER_TOTAL_CLP) {
    throw new Error(`TRANSFER_RELEASE_INCOMPLETE: totalMontoClp=${totalMontoClp} < minimum=${CANONICAL_MIN_TRANSFER_TOTAL_CLP}`);
  }
  return true;
}
