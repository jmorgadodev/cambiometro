function officialText(value) {
  if (typeof value !== "string") return null;
  const text = value.split("|")[0].replace(/\s+/g, " ").trim();
  return text || null;
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
