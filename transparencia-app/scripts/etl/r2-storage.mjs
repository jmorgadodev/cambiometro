const DEFAULT_WARNING_RATIO = 0.8;
const DEFAULT_GROWTH_BLOCK_RATIO = 0.9;

function asNonNegativeInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`INVALID_R2_STORAGE_${name.toUpperCase()}`);
  return value;
}

function objectRows(inventory) {
  return (Array.isArray(inventory?.objects) ? inventory.objects : []).map((object) => ({
    key: String(object?.key ?? "").trim(),
    size: asNonNegativeInteger(Number(object?.size ?? 0), "object_size"),
    checksumSha256: String(object?.checksumSha256 ?? "").trim(),
  })).filter((object) => object.key);
}

export function activeProjectionVersions(manifests = []) {
  const active = {};
  for (const manifest of manifests) {
    const dataset = String(manifest?.dataset ?? manifest?.sourceId ?? "").trim();
    const version = String(manifest?.version ?? "").trim();
    if (dataset && version) active[dataset] = version;
  }
  return active;
}

/**
 * Resume el inventario de R2 sin consultar ni modificar el bucket.
 * `duplicateBytes` es sólo una oportunidad potencial: no autoriza borrar
 * objetos porque dos claves iguales pueden cumplir funciones distintas.
 */
export function summarizeR2Storage(inventory, options = {}) {
  const limitBytes = asNonNegativeInteger(Number(inventory?.limitBytes ?? 0), "limit_bytes");
  if (limitBytes < 1) throw new Error("INVALID_R2_STORAGE_LIMIT_BYTES");
  const warningRatio = Number(options.warningRatio ?? DEFAULT_WARNING_RATIO);
  const growthBlockRatio = Number(options.growthBlockRatio ?? DEFAULT_GROWTH_BLOCK_RATIO);
  if (!(warningRatio >= 0 && warningRatio < growthBlockRatio && growthBlockRatio <= 1)) {
    throw new Error("INVALID_R2_STORAGE_THRESHOLDS");
  }

  const objects = objectRows(inventory);
  const referencedKeys = options.referencedKeys == null
    ? null
    : new Set(Array.from(options.referencedKeys, (key) => String(key ?? "").trim()).filter(Boolean));
  const activeVersions = options.activeVersions && typeof options.activeVersions === "object"
    ? options.activeVersions
    : {};
  const computedBytes = objects.reduce((total, object) => total + object.size, 0);
  const declaredBytes = inventory?.usedBytes == null ? computedBytes : asNonNegativeInteger(Number(inventory.usedBytes), "used_bytes");
  const usedBytes = declaredBytes;
  const checksumGroups = new Map();
  const prefixes = new Map();
  const projectionVersions = new Map();
  for (const object of objects) {
    if (object.checksumSha256) {
      const group = checksumGroups.get(object.checksumSha256) ?? { checksumSha256: object.checksumSha256, count: 0, bytes: 0, size: object.size, keys: [] };
      group.count += 1;
      group.bytes += object.size;
      group.size = Math.max(group.size, object.size);
      group.keys.push(object.key);
      checksumGroups.set(object.checksumSha256, group);
    }
    const prefix = object.key.split("/")[0] ?? "";
    const group = prefixes.get(prefix) ?? { objects: 0, bytes: 0 };
    group.objects += 1;
    group.bytes += object.size;
    prefixes.set(prefix, group);

    const version = object.key.match(/^projections\/([^/]+)\/versions\/([^/]+)\//);
    if (version) {
      const key = `${version[1]}@${version[2]}`;
      const versionGroup = projectionVersions.get(key) ?? {
        dataset: version[1],
        version: version[2],
        objects: 0,
        bytes: 0,
        retentionStatus: Object.prototype.hasOwnProperty.call(activeVersions, version[1])
          ? activeVersions[version[1]] === version[2] ? "active" : "historical"
          : "unclassified",
      };
      versionGroup.objects += 1;
      versionGroup.bytes += object.size;
      projectionVersions.set(key, versionGroup);
    }
  }

  const duplicateGroups = [...checksumGroups.values()].filter((group) => group.count > 1);
  const duplicateBytes = duplicateGroups.reduce((total, group) => total + group.bytes - group.size, 0);
  const ratio = usedBytes / limitBytes;
  const status = ratio >= growthBlockRatio ? "growth-blocked" : ratio >= warningRatio ? "archive-review" : "healthy";
  return {
    limitBytes,
    usedBytes,
    computedBytes,
    accountingDeltaBytes: usedBytes - computedBytes,
    freeBytes: Math.max(0, limitBytes - usedBytes),
    ratio,
    status,
    growthAllowed: ratio < growthBlockRatio,
    objectCount: objects.length,
    duplicateChecksumGroups: duplicateGroups.length,
    duplicateBytes,
    duplicateGroups: duplicateGroups
      .map((group) => ({
        checksumSha256: group.checksumSha256,
        count: group.count,
        bytes: group.bytes,
        reclaimableBytes: group.bytes - group.size,
        keys: [...group.keys].sort(),
        referenceStatus: referencedKeys === null
          ? "unknown"
          : group.keys.some((key) => referencedKeys.has(key)) ? "referenced" : "unreferenced-by-supplied-set",
        referencedKeys: referencedKeys === null ? [] : group.keys.filter((key) => referencedKeys.has(key)).sort(),
      }))
      .sort((left, right) => right.reclaimableBytes - left.reclaimableBytes || String(left.checksumSha256).localeCompare(String(right.checksumSha256))),
    byPrefix: [...prefixes.entries()]
      .map(([prefix, value]) => ({ prefix, ...value }))
      .sort((left, right) => right.bytes - left.bytes || left.prefix.localeCompare(right.prefix)),
    projectionVersions: [...projectionVersions.values()]
      .sort((left, right) => right.bytes - left.bytes || left.dataset.localeCompare(right.dataset) || left.version.localeCompare(right.version)),
    activeProjectionVersions: activeVersions,
    historicalProjectionBytes: [...projectionVersions.values()]
      .filter((version) => version.retentionStatus === "historical")
      .reduce((total, version) => total + version.bytes, 0),
    thresholds: { warningRatio, growthBlockRatio },
  };
}

/**
 * Builds a dry-run retention proposal. It never mutates the inventory and
 * never authorizes deletion by itself: every candidate still requires an
 * explicit retention/rollback decision.
 */
export function planR2Retention(inventory, options = {}) {
  const activeVersions = options.activeVersions && typeof options.activeVersions === "object"
    ? options.activeVersions
    : {};
  const summary = summarizeR2Storage(inventory, { ...options, activeVersions });
  const groups = new Map();
  for (const object of objectRows(inventory)) {
    const match = object.key.match(/^projections\/([^/]+)\/versions\/([^/]+)\//);
    if (!match) continue;
    const [dataset, version] = [match[1], match[2]];
    if (activeVersions[dataset] === version) continue;
    const key = `${dataset}@${version}`;
    const group = groups.get(key) ?? { dataset, version, objects: 0, bytes: 0, keys: [] };
    group.objects += 1;
    group.bytes += object.size;
    group.keys.push(object.key);
    groups.set(key, group);
  }
  const candidates = [...groups.values()]
    .filter((group) => Object.prototype.hasOwnProperty.call(activeVersions, group.dataset))
    .map((group) => ({
      ...group,
      keys: [...group.keys].sort(),
      retentionStatus: "historical",
      deletionAllowed: false,
      requiresExplicitApproval: true,
      reason: "versión no activa; requiere verificación de rollback y aprobación explícita",
    }))
    .sort((left, right) => right.bytes - left.bytes || left.dataset.localeCompare(right.dataset) || left.version.localeCompare(right.version));
  const candidateBytes = candidates.reduce((total, candidate) => total + candidate.bytes, 0);
  return {
    dryRun: true,
    activeProjectionVersions: activeVersions,
    candidates,
    candidateBytes,
    projectedUsedBytesAfterAllCandidates: Math.max(0, summary.usedBytes - candidateBytes),
    projectedRatioAfterAllCandidates: Math.max(0, summary.usedBytes - candidateBytes) / summary.limitBytes,
    summary,
  };
}
