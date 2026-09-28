export function presupuestoSubsetCount(raw) {
  const programs = raw?.programs;
  if (!Array.isArray(programs)) throw new Error("PRESUPUESTO_SUBSET_PROGRAMS_MISSING");
  const declared = raw.count;
  if (declared !== undefined && (!Number.isSafeInteger(declared) || declared < 0)) {
    throw new Error("PRESUPUESTO_SUBSET_COUNT_INVALID");
  }
  if (declared !== undefined && declared !== programs.length) {
    throw new Error("PRESUPUESTO_SUBSET_COUNT_MISMATCH");
  }
  return declared ?? programs.length;
}
