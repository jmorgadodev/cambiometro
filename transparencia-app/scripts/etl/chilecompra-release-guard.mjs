function countListings(listingCounts) {
  return Object.values(listingCounts ?? {}).reduce((total, value) => {
    const count = Number(value);
    return Number.isSafeInteger(count) && count > 0 ? total + count : total;
  }, 0);
}

export function assertChileCompraReleaseUsable({ result, projectedRecords }) {
  const period = typeof result?.period === "string" ? result.period : "unknown";
  const listings = countListings(result?.listingCounts);
  const documents = Array.isArray(result?.documents) ? result.documents.length : 0;
  const records = Array.isArray(result?.records) ? result.records.length : 0;
  const projectedCount = Array.isArray(projectedRecords) ? projectedRecords.length : 0;
  const summary = { period, listings, documents, records, projectedRecords: projectedCount };

  if (listings === 0 || documents === 0 || records === 0 || projectedCount === 0) {
    throw new Error(`CHILECOMPRA_RELEASE_EMPTY_OR_UNAVAILABLE:${JSON.stringify(summary)}`);
  }
  return summary;
}
