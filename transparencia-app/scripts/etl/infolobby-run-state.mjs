export function infolobbyRunOutputs(recordCount) {
  if (!Number.isSafeInteger(recordCount) || recordCount < 0) {
    throw new Error("INFOLOBBY_INVALID_RECORD_COUNT");
  }

  return {
    hasRecords: recordCount > 0,
    recordCount: String(recordCount),
  };
}
