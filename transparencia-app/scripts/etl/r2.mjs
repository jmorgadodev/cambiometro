const DEFAULT_LIMIT_BYTES = 8 * 1024 * 1024 * 1024;

function latestPrefixes(assets) {
  const latest = new Map();
  for (const asset of assets) {
    const parts = asset.key.split("/");
    if (parts[0] !== "partitions" || parts.length < 5) continue;
    const sourceId = parts[1];
    const hasVariant = !/^\d{4}$/.test(parts[2]);
    const variant = hasVariant ? parts[2] : null;
    const year = hasVariant ? parts[3] : parts[2];
    const month = hasVariant ? parts[4] : parts[3];
    if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) continue;
    const period = `${year}-${month}`;
    const namespace = `${sourceId}/${variant ?? "default"}`;
    if (!latest.has(namespace) || period > latest.get(namespace).period) {
      const prefix = variant
        ? `partitions/${sourceId}/${variant}/${year}/${month}/`
        : `partitions/${sourceId}/${year}/${month}/`;
      latest.set(namespace, { period, prefix });
    }
  }
  return new Set([...latest.values()].map((value) => value.prefix));
}

function catalogLatestPrefixes(assets) {
  const catalogAsset = assets.find((asset) => asset.key === "catalog/v1/manifest.json");
  if (!catalogAsset?.data) return latestPrefixes(assets);
  try {
    const catalog = JSON.parse(Buffer.from(catalogAsset.data).toString("utf8"));
    const prefixes = new Set();
    for (const partition of catalog.partitions ?? []) {
      const key = String(partition.manifestKey ?? "");
      const match = key.match(/^(partitions\/[^/]+\/(?:[^/]+\/)?\d{4}\/\d{2}\/)/);
      if (match) prefixes.add(match[1]);
    }
    return prefixes.size > 0 ? prefixes : latestPrefixes(assets);
  } catch {
    return latestPrefixes(assets);
  }
}

function parseAssetJson(asset, label) {
  if (!asset?.data) return null;
  try {
    return JSON.parse(Buffer.from(asset.data).toString("utf8"));
  } catch {
    throw new Error(`R2_INVALID_MANIFEST_JSON:${label}`);
  }
}

/**
 * Verifica que el catálogo que se va a activar no apunte a manifiestos o
 * artefactos que el inventario final de R2 no conservará. Esta comprobación
 * ocurre antes de borrar objetos fríos o activar el catálogo nuevo.
 */
export function assertR2CatalogClosure(assets, inventory) {
  const assetByKey = new Map((assets ?? []).map((asset) => [asset.key, asset]));
  const inventoryKeys = new Set((inventory?.objects ?? []).map((object) => object.key));
  const catalogAsset = assetByKey.get("catalog/v1/manifest.json");
  if (!catalogAsset) throw new Error("R2_CATALOG_MISSING_FROM_PUBLICATION");
  if (!inventoryKeys.has(catalogAsset.key)) throw new Error("R2_CATALOG_NOT_IN_FINAL_INVENTORY");
  const catalog = parseAssetJson(catalogAsset, catalogAsset.key);
  const partitions = Array.isArray(catalog?.partitions) ? catalog.partitions : [];
  let checkedManifests = 0;
  let checkedArtifacts = 0;
  for (const partition of partitions) {
    const manifestKey = String(partition?.manifestKey ?? "");
    if (!manifestKey) throw new Error(`R2_CATALOG_PARTITION_MANIFEST_MISSING:${partition?.id ?? "unknown"}`);
    if (!inventoryKeys.has(manifestKey)) throw new Error(`R2_CATALOG_REFERENCES_UNPUBLISHED_MANIFEST:${manifestKey}`);
    checkedManifests += 1;
    const manifestAsset = assetByKey.get(manifestKey);
    if (!manifestAsset) continue;
    const manifest = parseAssetJson(manifestAsset, manifestKey);
    for (const artifact of Array.isArray(manifest?.artifacts) ? manifest.artifacts : []) {
      const artifactKey = String(artifact?.key ?? "");
      if (!artifactKey) continue;
      if (!inventoryKeys.has(artifactKey)) throw new Error(`R2_MANIFEST_REFERENCES_UNPUBLISHED_ARTIFACT:${artifactKey}`);
      checkedArtifacts += 1;
    }
  }
  return { checkedManifests, checkedArtifacts };
}

export function selectHotAssets(assets) {
  // El catálogo es la fuente de verdad del histórico: si una partición sigue
  // referenciada, sus objetos deben permanecer publicables aunque no sea la
  // última del período. La última partición se conserva como fallback cuando
  // se trabaja con un catálogo antiguo sin datos legibles.
  const prefixes = new Set([...latestPrefixes(assets), ...catalogLatestPrefixes(assets)]);
  return assets.filter((asset) => asset.key.startsWith("catalog/")
    || asset.key.startsWith("sources/")
    || asset.key.startsWith("entities/")
    || asset.key.startsWith("indexes/")
    || asset.key.startsWith("projections/")
    // InfoProbidad se consulta por historial de declaraciones. Mantener sólo
    // el mes más reciente deja el catálogo apuntando a particiones ausentes y
    // convierte una fuente histórica en una muestra reciente.
    || asset.key.startsWith("partitions/infoprobidad/")
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
      const partition = key.match(/^(partitions\/[^/]+\/(?:[^/]+\/)?\d{4}\/\d{2}\/)/)?.[1];
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
