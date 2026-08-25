export const CANONICAL_MIN_TRANSFER_ROWS = 59_361;

export function assertMinimumTransferRows(totalRows, minimum = CANONICAL_MIN_TRANSFER_ROWS) {
  if (!Number.isInteger(totalRows) || totalRows < minimum) {
    throw new Error(`TRANSFER_RELEASE_INCOMPLETE: totalRows=${totalRows} < minimum=${minimum}`);
  }
  return totalRows;
}
