function nullableCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function buildTransferApiManifest(manifest) {
  const releasePrefix = `projections/transferencias-v1/releases/${manifest.checksumSha256}`;
  return {
    schemaVersion: manifest.schemaVersion,
    dataset: manifest.dataset,
    generatedAt: manifest.generatedAt,
    registeredThrough: manifest.registeredThrough ?? null,
    sourceRows: nullableCount(manifest.sourceRows),
    duplicateExactRows: nullableCount(manifest.duplicateExactRows),
    duplicateConflictingRows: nullableCount(manifest.duplicateConflictingRows),
    excludedAfterCutoff: nullableCount(manifest.excludedAfterCutoff),
    totalRows: manifest.totalRows,
    pageSize: manifest.pageSize,
    totalPages: manifest.totalPages,
    checksumSha256: manifest.checksumSha256,
    expected: manifest.expected,
    releasePrefix,
    pages: manifest.pages.map((page) => ({
      ...page,
      key: `${releasePrefix}/${page.path.split("/").pop()}`,
    })),
    searchIndex: {
      ...manifest.searchIndex,
      key: `${releasePrefix}/search-index.json`,
    },
  };
}

export function buildTransferApiPublishSummary({ bucket, apiManifest, storageBudget }) {
  return {
    bucket,
    dataset: apiManifest.dataset,
    totalRows: apiManifest.totalRows,
    totalPages: apiManifest.totalPages,
    checksumSha256: apiManifest.checksumSha256,
    releasePrefix: apiManifest.releasePrefix,
    storageBudget: {
      currentBytes: storageBudget.currentBytes,
      projectedBytes: storageBudget.projectedBytes,
      peakBytes: storageBudget.peakBytes,
    },
  };
}
