/** Observed Cámara periods withheld from public releases after integrity review. */
export const PUBLIC_EXPENSE_EXCLUDED_PERIODS = Object.freeze({
  gastos_camara: Object.freeze(["2026-07", "2026-08"]),
});

export function isPublicExpensePeriod(source, period) {
  return !PUBLIC_EXPENSE_EXCLUDED_PERIODS[source]?.includes(period);
}
