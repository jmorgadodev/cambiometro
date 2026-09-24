export function expenseMonthWindow(latestMonth, { fullHistory = false, overlapMonths = 1 } = {}) {
  if (!Number.isSafeInteger(latestMonth) || latestMonth < 1 || latestMonth > 12) throw new Error("ETL_EXPENSE_INVALID_MONTH");
  if (!Number.isSafeInteger(overlapMonths) || overlapMonths < 0 || overlapMonths > 3) throw new Error("ETL_EXPENSE_INVALID_OVERLAP");
  return {
    firstMonth: fullHistory ? 1 : Math.max(1, latestMonth - overlapMonths),
    lastMonth: latestMonth,
  };
}

export function selectSenateExpensePeriods(publishedPeriods, { latest, fullHistory = false, overlapMonths = 1 } = {}) {
  if (!Array.isArray(publishedPeriods) || publishedPeriods.length === 0) throw new Error("ETL_EXPENSE_NO_PUBLISHED_PERIODS");
  if (!latest || !Number.isSafeInteger(latest.year) || latest.year < 1990 || latest.year > 2100 || !Number.isSafeInteger(latest.month) || latest.month < 1 || latest.month > 12) {
    throw new Error("ETL_EXPENSE_INVALID_LATEST_PERIOD");
  }

  const seen = new Set();
  const normalized = publishedPeriods.map(({ year, month }) => {
    if (!Number.isSafeInteger(year) || year < 1990 || year > 2100 || !Number.isSafeInteger(month) || month < 1 || month > 12) {
      throw new Error("ETL_EXPENSE_INVALID_PUBLISHED_PERIOD");
    }
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (seen.has(key)) throw new Error("ETL_EXPENSE_DUPLICATE_PERIOD");
    seen.add(key);
    return { year, month };
  }).sort((a, b) => a.year - b.year || a.month - b.month);

  const latestKey = `${latest.year}-${String(latest.month).padStart(2, "0")}`;
  if (!seen.has(latestKey)) throw new Error("ETL_EXPENSE_LATEST_PERIOD_NOT_PUBLISHED");
  if (fullHistory) return normalized;

  expenseMonthWindow(latest.month, { overlapMonths });
  const latestIndex = latest.year * 12 + latest.month - 1;
  const firstIndex = latestIndex - overlapMonths;
  return normalized.filter(({ year, month }) => {
    const periodIndex = year * 12 + month - 1;
    return periodIndex >= firstIndex && periodIndex <= latestIndex;
  });
}

