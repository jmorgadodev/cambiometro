const COUNT_FIELDS = [
  ["recordCount", "records"],
  ["entityCount", "entities"],
  ["relationCount", "relations"],
];

export function contraloriaSubsetCounts(raw) {
  const counts = {};
  for (const [countField, rowsField] of COUNT_FIELDS) {
    const rows = raw?.[rowsField];
    if (!Array.isArray(rows)) throw new Error(`CONTRALORIA_SUBSET_ARRAY_MISSING:${rowsField}`);
    const declared = raw[countField];
    if (declared !== undefined && (!Number.isSafeInteger(declared) || declared < 0)) {
      throw new Error(`CONTRALORIA_SUBSET_COUNT_INVALID:${countField}`);
    }
    if (declared !== undefined && declared !== rows.length) {
      throw new Error(`CONTRALORIA_SUBSET_COUNT_MISMATCH:${countField}`);
    }
    counts[countField] = declared ?? rows.length;
  }
  return counts;
}
