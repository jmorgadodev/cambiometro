const DEFAULT_LIMIT_BYTES = 8 * 1024 * 1024 * 1024;

function latestPrefixes(assets) {
  const latest = new Map();
  for (const asset of assets) {
    const match = asset.key.match(/^partitions\/([^/]+)\/(\d{4})\/(\d{2})\//);
    if (!match) continue;
    const [, sourceId, year, month] = match;
    const period = `${year}-${month}`;
    if (!latest.has(sourceId) || period > latest.get(sourceId).period) {
      latest.set(sourceId, { period, prefix: `partitions/${sourceId}/${year}/${month}/` });
    }
  }
  return new Set([...latest.values()].map((value) => value.prefix));
}

function catalogLatestPrefixes(assets) {
  const catalogAsset = assets.find((asset) => asset.key === "catalog/v1/manifest.json");
  if (!catalogAsset?.data) return latestPrefixes(assets);
  try {
    const catalog = JSON.parse(Buffer.from(catalogAsset.data).toString("utf8"));
    return latestPrefixes((catalog.partitions ?? []).map((partition) => ({ key: `${partition.manifestKey ?? `partitions/${partition.sourceId}/${partition.period.replace("-", "/")}/manifest.json`}` })));
  } catch {
    return latestPrefixes(assets);
  }
}

export function selectHotAssets(assets) {
  const prefixes = latestPrefixes(assets);
  return assets.filter((asset) => asset.key.startsWith("catalog/")
    || asset.key.startsWith("sources/")
    || asset.key.startsWith("entities/")
    || asset.key.startsWith("indexes/")
    || asset.key.startsWith("projections/")
    || [...prefixes].some((prefix) => asset.key.startsWith(prefix)));
}

function publicationRank(key) {
  if (key === "catalog/v1/manifest.json" || /^projections\/[^/]+\/manifest\.json$/.test(key)) return 2;
  if (key.endsWith("/manifest.json")) return 1;
  return 0;
}

function projectionVersion(key) {
  const match = key.match(/^projections\/([^/]+)\/versions\/([^/]+)\//);
  return match ? { dataset: match[1], version: match[2] } : null;
}

function pruneObsoleteProjectionVersions(desired, previous, assets) {
  const incomingByDataset = new Map();
  for (const asset of assets) {
    const parsed = projectionVersion(asset.key);
    if (!parsed) continue;
    if (!incomingByDataset.has(parsed.dataset)) incomingByDataset.set(parsed.dataset, new Set());
    incomingByDataset.get(parsed.dataset).add(parsed.version);
  }

  for (const [dataset, incomingVersions] of incomingByDataset) {
    const previousVersions = new Set();
    for (const key of previous.keys()) {
      const parsed = projectionVersion(key);
      if (parsed?.dataset === dataset) previousVersions.add(parsed.version);
    }
    const rollbackVersion = [...previousVersions].sort().at(-1);
    const retained = new Set(incomingVersions);
    if (rollbackVersion) retained.add(rollbackVersion);

    for (const key of previous.keys()) {
      const parsed = projectionVersion(key);
      if (parsed?.dataset === dataset && !retained.has(parsed.version)) desired.delete(key);
    }
  }
}

export function planR2Publication(assets, previousInventory = { objects: [] }, limitBytes = DEFAULT_LIMIT_BYTES) {
  if (!Number.isSafeInteger(limitBytes) || limitBytes < 1) throw new Error("INVALID_R2_LIMIT");
  const hot = selectHotAssets(assets);
  const previous = new Map((previousInventory.objects ?? []).map((object) => [object.key, object]));
  const desired = new Map(previous);
  for (const asset of hot) desired.set(asset.key, asset);
  // Cada proyección versionada conserva la candidata entrante y la versión
  // activa previa como rollback. Las copias más antiguas no son referenciadas
  // por ningún manifiesto y duplican gigabytes sin aportar disponibilidad.
  pruneObsoleteProjectionVersions(desired, previous, hot);
  const previousBytes = [...previous.values()].reduce((total, object) => total + object.size, 0);
  let projectedBytes = [...desired.values()].reduce((total, object) => total + object.size, 0);
  let ratio = projectedBytes / limitBytes;
  if (ratio >= 0.8) {
    const latest = catalogLatestPrefixes(assets);
    for (const key of previous.keys()) {
      const partition = key.match(/^(partitions\/[^/]+\/\d{4}\/\d{2}\/)/)?.[1];
      if (partition && !latest.has(partition)) desired.delete(key);
    }
    projectedBytes = [...desired.values()].reduce((total, object) => total + object.size, 0);
    ratio = projectedBytes / limitBytes;
  }
  if (ratio >= 0.9 && projectedBytes > previousBytes) throw new Error("R2_GROWTH_BLOCKED_AT_90_PERCENT");

  const puts = hot
    .filter((asset) => previous.get(asset.key)?.checksumSha256 !== asset.checksumSha256)
    .sort((left, right) => {
      const rank = publicationRank(left.key) - publicationRank(right.key);
      if (rank !== 0) return rank;
      return left.key.localeCompare(right.key);
    });
  const deletes = [...previous.keys()].filter((key) => !desired.has(key));
  return {
    action: ratio >= 0.8 ? "archive_cold_partitions" : "publish",
    limitBytes,
    previousBytes,
    projectedBytes,
    ratio,
    puts,
    deletes,
    inventory: {
      schemaVersion: "1.0.0",
      limitBytes,
      usedBytes: projectedBytes,
      objects: [...desired.values()].map(({ key, size, checksumSha256 }) => ({ key, size, checksumSha256 })).sort((a, b) => a.key.localeCompare(b.key)),
    },
  };
}
