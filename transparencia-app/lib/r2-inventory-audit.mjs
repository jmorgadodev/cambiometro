function integer(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function projectionVersion(key) {
  const match = String(key).match(/^projections\/([^/]+)\/versions\/([^/]+)\//);
  return match ? { dataset: match[1], version: match[2] } : null;
}

export function summarizeR2Inventory(inventory = {}) {
  const limitBytes = integer(inventory.limitBytes) || 10_000_000_000;
  const objects = Array.isArray(inventory.objects) ? inventory.objects : [];
  const usedBytes = integer(inventory.usedBytes) || objects.reduce((sum, object) => sum + integer(object.size), 0);
  const ratio = usedBytes / limitBytes;
  const status = ratio >= 0.95 ? "blocked" : ratio >= 0.9 ? "review" : ratio >= 0.8 ? "watch" : "ok";

  const datasetMap = new Map();
  for (const object of objects) {
    const parsed = projectionVersion(object.key);
    if (!parsed) continue;
    if (!datasetMap.has(parsed.dataset)) datasetMap.set(parsed.dataset, new Map());
    const versions = datasetMap.get(parsed.dataset);
    if (!versions.has(parsed.version)) versions.set(parsed.version, 0);
    versions.set(parsed.version, versions.get(parsed.version) + integer(object.size));
  }
  const datasets = [...datasetMap.entries()]
    .map(([dataset, versions]) => ({
      dataset,
      versionCount: versions.size,
      versions: [...versions.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([version, bytes]) => ({ version, bytes })),
      bytes: [...versions.values()].reduce((sum, bytes) => sum + bytes, 0),
    }))
    .sort((left, right) => right.bytes - left.bytes);

  const checksums = new Map();
  for (const object of objects) {
    const checksum = String(object.checksumSha256 ?? "");
    if (!checksum) continue;
    if (!checksums.has(checksum)) checksums.set(checksum, []);
    checksums.get(checksum).push(object);
  }
  const duplicateChecksumGroups = [...checksums.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([checksum, group]) => ({ checksum, count: group.length, bytes: group.reduce((sum, object) => sum + integer(object.size), 0) }))
    .sort((left, right) => right.bytes - left.bytes);

  const prefixMap = new Map();
  for (const object of objects) {
    const prefix = String(object.key ?? "").split("/").slice(0, 2).join("/");
    prefixMap.set(prefix, (prefixMap.get(prefix) ?? 0) + integer(object.size));
  }

  return {
    schemaVersion: 1,
    generatedAt: inventory.generatedAt ?? null,
    usedBytes,
    limitBytes,
    ratio,
    status,
    objectCount: objects.length,
    datasets,
    largestPrefixes: [...prefixMap.entries()]
      .map(([prefix, bytes]) => ({ prefix, bytes }))
      .sort((left, right) => right.bytes - left.bytes)
      .slice(0, 12),
    duplicateChecksumGroups,
    policy: { watchAt: 0.8, reviewAt: 0.9, blockAt: 0.95, deletesPerformed: false },
  };
}
