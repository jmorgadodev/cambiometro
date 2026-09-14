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
  const computedBytes = objects.reduce((total, object) => total + object.size, 0);
  const declaredBytes = inventory?.usedBytes == null ? computedBytes : asNonNegativeInteger(Number(inventory.usedBytes), "used_bytes");
  const usedBytes = declaredBytes;
  const checksumGroups = new Map();
  const prefixes = new Map();
  for (const object of objects) {
    if (object.checksumSha256) {
      const group = checksumGroups.get(object.checksumSha256) ?? { count: 0, bytes: 0, size: object.size };
      group.count += 1;
      group.bytes += object.size;
      group.size = Math.max(group.size, object.size);
      checksumGroups.set(object.checksumSha256, group);
    }
    const prefix = object.key.split("/")[0] ?? "";
    const group = prefixes.get(prefix) ?? { objects: 0, bytes: 0 };
    group.objects += 1;
    group.bytes += object.size;
    prefixes.set(prefix, group);
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
    byPrefix: [...prefixes.entries()]
      .map(([prefix, value]) => ({ prefix, ...value }))
      .sort((left, right) => right.bytes - left.bytes || left.prefix.localeCompare(right.prefix)),
    thresholds: { warningRatio, growthBlockRatio },
  };
}
