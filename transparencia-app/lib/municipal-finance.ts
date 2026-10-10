type Indicator = { code: string; period?: string; monto_clp?: number | null };

export function municipalFcmCut(indicators: Indicator[]) {
  const income = indicators.filter(i => i.code === "IADM01" && /^\d{4}$/.test(i.period ?? ""))
    .sort((a, b) => Number(b.period) - Number(a.period))[0];
  const fund = income ? indicators.find(i => i.code === "IADM40" && i.period === income.period) : undefined;
  const amount = (i: Indicator | undefined) => typeof i?.monto_clp === "number" && Number.isFinite(i.monto_clp) ? i.monto_clp : null;
  const total = amount(income);
  const received = amount(fund);
  return { periodo: income?.period ?? null, ingresos_totales_clp: total, fcm_ingresos_clp: received,
    fcm_dependencia_pct: total !== null && total > 0 && received !== null && received >= 0 && received <= total
      ? Number((received / total * 100).toFixed(1)) : null };
}

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
