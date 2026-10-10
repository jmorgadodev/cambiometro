export function infoLobbyDefaultFrom(now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("INFOLOBBY_INVALID_CLOCK");
  }
  const quarterStartMonth = Math.floor(now.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth - 3, 1))
    .toISOString()
    .slice(0, 10);
}

export function infolobbyRunOutputs(recordCount) {
  if (!Number.isSafeInteger(recordCount) || recordCount < 0) {
    throw new Error("INFOLOBBY_INVALID_RECORD_COUNT");
  }

  return {
    hasRecords: recordCount > 0,
    recordCount: String(recordCount),
  };
}
