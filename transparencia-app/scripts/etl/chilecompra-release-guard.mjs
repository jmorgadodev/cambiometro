export function assertNonEmptyChileCompraRelease(records, { allowEmpty = false } = {}) {
  if (!Array.isArray(records)) throw new Error("CHILECOMPRA_RELEASE_INVALID_RECORDS");
  if (records.length === 0 && !allowEmpty) throw new Error("CHILECOMPRA_EMPTY_RELEASE_BLOCKED");
  return records;
}
