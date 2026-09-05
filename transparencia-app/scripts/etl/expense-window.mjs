export function expenseMonthWindow(latestMonth, { fullHistory = false, overlapMonths = 1 } = {}) {
  if (!Number.isSafeInteger(latestMonth) || latestMonth < 1 || latestMonth > 12) throw new Error("ETL_EXPENSE_INVALID_MONTH");
  if (!Number.isSafeInteger(overlapMonths) || overlapMonths < 0 || overlapMonths > 3) throw new Error("ETL_EXPENSE_INVALID_OVERLAP");
  return {
    firstMonth: fullHistory ? 1 : Math.max(1, latestMonth - overlapMonths),
    lastMonth: latestMonth,
  };
}

