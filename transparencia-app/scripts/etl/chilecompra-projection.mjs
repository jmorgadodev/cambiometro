function officialText(value) {
  if (typeof value !== "string") return null;
  const text = value.split("|")[0].replace(/\s+/g, " ").trim();
  return text || null;
}

export const MAX_CHILECOMPRA_RELATION_AMOUNT_CLP = 100_000_000_000;

export function evaluateProjectionAmount(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return { monto_clp: null, anomaly: null };
  if (value < 0) return {
    monto_clp: null,
    anomaly: { severity: "ALTA", validation: "V7", violations: ["monto_negativo"] },
  };
  if (value > MAX_CHILECOMPRA_RELATION_AMOUNT_CLP) return {
    monto_clp: null,
    anomaly: { severity: "ALTA", validation: "V7", violations: ["monto_relacion"] },
  };
  return { monto_clp: value, anomaly: null };
}

export function normalizeProjectionContract(data) {
  const supplier = Array.isArray(data?.suppliers) ? data.suppliers[0] : null;
  const rawSupplierId = officialText(supplier?.id);
  return {
    title: officialText(data?.title),
    monto_clp: typeof data?.monto_clp === "number" && Number.isFinite(data.monto_clp)
      ? data.monto_clp
      : null,
    proveedor_id: rawSupplierId
      ? `provider-chilecompra-${rawSupplierId.replace(/^CL-MP-/, "")}`
      : null,
    proveedor: officialText(supplier?.name),
  };
}

export function sumKnownAmounts(values) {
  const known = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  return known.length > 0 ? known.reduce((sum, value) => sum + value, 0) : null;
}
