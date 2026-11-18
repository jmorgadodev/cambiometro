const SUMMARY_ITEMS = new Set(["VALOR TOTAL", "TOTAL", "TOTAL GASTOS", "TOTAL GASTOS OPERACIONALES", "TOTAL GENERAL", "VALOR TOTAL MES", "TOTAL RENDIDO", "TOTAL OPERACIONAL"]);

export function isExpensePeriod(value) { return typeof value === "string" && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value); }

export function isExpenseAmount(value, sourceId) {
  if (value === null || value === undefined) return true;
  return Number.isSafeInteger(value) && (sourceId === "gastos_senado" || value >= 0);
}

export function isExpenseSummaryItem(value) {
  return typeof value === "string" && SUMMARY_ITEMS.has(value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim());
}
