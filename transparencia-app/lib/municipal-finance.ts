type Indicator = { code: string; period?: string; monto_clp?: number | null };

/** A budget cut does not borrow amounts from a different year. */
export function municipalBudgetCut(indicators: Indicator[]) {
  const years = indicators.filter(i => ["BPVIM", "BPIIM"].includes(i.code) && /^\d{4}$/.test(i.period ?? "") && typeof i.monto_clp === "number" && Number.isFinite(i.monto_clp)).map(i => Number(i.period));
  if (!years.length) return null;
  const year = Math.max(...years);
  const value = (code: string) => {
    const indicator = indicators.find(i => i.code === code && Number(i.period) === year);
    return typeof indicator?.monto_clp === "number" && Number.isFinite(indicator.monto_clp) ? indicator.monto_clp : null;
  };
  return { ano: year, inicial_clp: value("BPIIM"), vigente_clp: value("BPVIM"), gasto_personal_clp: value("IADM61"), ingresos_propios_clp: null };
}
