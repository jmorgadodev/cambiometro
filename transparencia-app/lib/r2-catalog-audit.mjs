function integer(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function partitionManifestKey(partition) {
  if (partition?.manifestKey) return String(partition.manifestKey);
  if (!partition?.sourceId || !/^\d{4}-\d{2}$/.test(String(partition.period ?? ""))) return null;
  return `partitions/${partition.sourceId}/${String(partition.period).replace("-", "/")}/manifest.json`;
}

export function auditCatalogReferences(catalog = {}, objectKeys = []) {
  const keys = objectKeys instanceof Set ? objectKeys : new Set(objectKeys.map(String));
  const missing = [];
  const present = [];
  for (const partition of Array.isArray(catalog.partitions) ? catalog.partitions : []) {
    const manifestKey = partitionManifestKey(partition);
    const item = {
      id: partition.id ?? null,
      sourceId: partition.sourceId ?? null,
      period: partition.period ?? null,
      recordCount: integer(partition.recordCount),
      manifestKey,
    };
    if (!manifestKey || !keys.has(manifestKey)) missing.push(item);
    else present.push(item);
  }

  const bySource = new Map();
  for (const item of [...present, ...missing]) {
    const source = item.sourceId ?? "unknown";
    if (!bySource.has(source)) bySource.set(source, { sourceId: source, partitions: 0, present: 0, missing: 0, declaredRows: 0, missingRows: 0 });
    const summary = bySource.get(source);
    summary.partitions += 1;
    summary.declaredRows += item.recordCount;
    if (missing.includes(item)) {
      summary.missing += 1;
      summary.missingRows += item.recordCount;
    } else {
      summary.present += 1;
    }
  }

  return {
    schemaVersion: 1,
    catalogPartitions: present.length + missing.length,
    presentPartitions: present.length,
    missingPartitions: missing.length,
    declaredRows: [...present, ...missing].reduce((sum, item) => sum + item.recordCount, 0),
    missingRows: missing.reduce((sum, item) => sum + item.recordCount, 0),
    bySource: [...bySource.values()].sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
    missing,
  };
}

/** @param {{ partitions?: Array<Record<string, unknown>> } | null} previousCatalog */
export function assertCatalogReferencesAvailable(catalog, availableKeys, previousCatalog = null) {
  const previous = new Map((previousCatalog?.partitions ?? []).map(partition => [partition.id, partition]));
  const relevant = previousCatalog ? { ...catalog, partitions: (catalog.partitions ?? []).filter(partition => {
    const old = previous.get(partition.id);
    return !old || Object.keys({ ...old, ...partition }).some(key => JSON.stringify(old[key]) !== JSON.stringify(partition[key]));
  }) } : catalog;
  const report = auditCatalogReferences(relevant, availableKeys);
  if (report.missingPartitions > 0) {
    const sample = report.missing.slice(0, 5).map((item) => item.manifestKey).join(", ");
    throw new Error(`R2_CATALOG_ORPHANED_PARTITIONS: ${report.missingPartitions} missing (${sample})`);
  }
  return report;
}
