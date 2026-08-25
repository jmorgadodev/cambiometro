export const CANONICAL_MIN_TRANSFER_ROWS = 59_361;
export const CANONICAL_TRANSFER_ROWS = 59_361;
export const CANONICAL_TRANSFER_TOTAL_CLP = 5_011_094_170_302;

export function assertMinimumTransferRows(totalRows, minimum = CANONICAL_MIN_TRANSFER_ROWS) {
  if (!Number.isInteger(totalRows) || totalRows < minimum) {
    throw new Error(`TRANSFER_RELEASE_INCOMPLETE: totalRows=${totalRows} < minimum=${minimum}`);
  }
  return totalRows;
}

export function assertCanonicalTransferRelease({ totalRows, totalMontoClp }) {
  if (totalRows !== CANONICAL_TRANSFER_ROWS) {
    throw new Error(`TRANSFER_RELEASE_CANONICAL_MISMATCH: totalRows=${totalRows} != canonical=${CANONICAL_TRANSFER_ROWS}`);
  }
  if (totalMontoClp !== CANONICAL_TRANSFER_TOTAL_CLP) {
    throw new Error(`TRANSFER_RELEASE_CANONICAL_MISMATCH: totalMontoClp=${totalMontoClp} != canonical=${CANONICAL_TRANSFER_TOTAL_CLP}`);
  }
  return true;
}
