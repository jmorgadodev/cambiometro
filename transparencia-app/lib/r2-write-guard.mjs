const DEFAULT_LIMIT_BYTES = 10_000_000_000;
const DEFAULT_BLOCK_RATIO = 0.95;

/** @typedef {{ bucket?: string, key?: string, size?: number }} R2ObjectLike */
/** @typedef {{ currentObjects?: R2ObjectLike[], puts?: R2ObjectLike[], deletes?: R2ObjectLike[], limitBytes?: number, blockRatio?: number }} R2WriteBudgetOptions */

/** @param {R2ObjectLike} item */
function normalizeObject(item) {
  const bucket = String(item?.bucket ?? "default");
  const key = String(item?.key ?? "");
  const size = Number(item?.size ?? 0);
  if (!key || !Number.isFinite(size) || size < 0) throw new Error("R2_WRITE_GUARD_INVALID_OBJECT");
  return { bucket, key, size };
}

function identity(item) {
  return `${item.bucket}\u0000${item.key}`;
}

function sum(values) {
  return [...values].reduce((total, value) => total + value.size, 0);
}

/**
 * Calculates account-wide R2 storage before a set of deletes and puts.
 * `peakBytes` is deliberately conservative: it assumes all incoming objects
 * coexist with the post-delete set before each replacement is settled.
 * @param {R2WriteBudgetOptions} options
 */
export function assessR2WriteBudget({
  currentObjects = [],
  puts = [],
  deletes = [],
  limitBytes = DEFAULT_LIMIT_BYTES,
  blockRatio = DEFAULT_BLOCK_RATIO,
} = {}) {
  if (!Number.isFinite(limitBytes) || limitBytes <= 0) throw new Error("R2_WRITE_GUARD_INVALID_LIMIT");
  if (!Number.isFinite(blockRatio) || blockRatio <= 0 || blockRatio > 1) throw new Error("R2_WRITE_GUARD_INVALID_RATIO");

  const current = new Map(currentObjects.map(normalizeObject).map((item) => [identity(item), item]));
  const normalizedPuts = puts.map(normalizeObject);
  const normalizedDeletes = deletes.map(normalizeObject);
  const afterDeletes = new Map(current);
  for (const item of normalizedDeletes) afterDeletes.delete(identity(item));

  const projected = new Map(afterDeletes);
  for (const item of normalizedPuts) projected.set(identity(item), item);

  const currentBytes = sum(current.values());
  const bytesAfterDeletes = sum(afterDeletes.values());
  const projectedBytes = sum(projected.values());
  const incomingBytes = sum(normalizedPuts);
  const peakBytes = bytesAfterDeletes + incomingBytes;
  const thresholdBytes = limitBytes * blockRatio;
  const blocked = peakBytes >= thresholdBytes || projectedBytes >= thresholdBytes;

  return {
    currentBytes,
    bytesAfterDeletes,
    incomingBytes,
    projectedBytes,
    peakBytes,
    limitBytes,
    blockRatio,
    thresholdBytes,
    currentRatio: currentBytes / limitBytes,
    projectedRatio: projectedBytes / limitBytes,
    peakRatio: peakBytes / limitBytes,
    blocked,
  };
}

/** @param {R2WriteBudgetOptions} options */
export function assertR2WriteBudget(options = {}) {
  const report = assessR2WriteBudget(options);
  if (report.blocked) {
    throw new Error(`R2_WRITE_BLOCKED_AT_95_PERCENT: peakBytes=${report.peakBytes} projectedBytes=${report.projectedBytes} limitBytes=${report.limitBytes}`);
  }
  return report;
}
