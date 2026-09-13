export function catalogSourceCount(sourceMap, sourceId, fallback = 0) {
  const value = sourceMap.get(sourceId)?.recordCount;
  return Number.isSafeInteger(value) ? value : fallback;
}

/** @param {Record<string, unknown>} catalog @param {string} sourceId @param {string|null} [variant] */
export function catalogPartitionCount(catalog, sourceId, variant = null) {
  return (catalog.partitions ?? [])
    .filter((partition) => partition.sourceId === sourceId && (!variant || partition.variant === variant))
    .reduce((sum, partition) => sum + Number(partition.recordCount ?? 0), 0);
}

/** @param {Record<string, unknown>} catalog @param {Map<string, {recordCount?: number}>} sourceMap @param {string} sourceId @param {string|null} [variant] */
export function catalogComponentCount(catalog, sourceMap, sourceId, variant = null) {
  // A variant is a partition-level category inside the parent source. It
  // must never inherit the parent's total recordCount.
  if (variant) return catalogPartitionCount(catalog, sourceId, variant);
  return catalogSourceCount(sourceMap, sourceId, 0);
}

export function transferReleaseCount(manifest, fallback) {
  return Number.isSafeInteger(manifest?.totalRows) && manifest.totalRows >= 0
    ? manifest.totalRows
    : fallback;
}
