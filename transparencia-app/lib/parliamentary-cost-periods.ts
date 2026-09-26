import { isPublishedMonthPeriod, latestPublishedPeriod } from "@/lib/month-periods";

export interface ExpenseMonthAmount {
  periodo: string;
  total: number;
}

export interface ParliamentaryCostPeriod {
  periodo: string;
  sueldo: number | null;
  gastos: number | null;
  personal: number | null;
}

export function buildParliamentCostPeriods(input: {
  expenseMonths: readonly ExpenseMonthAmount[];
  staffAmountsByPeriod: ReadonlyMap<string, number>;
  salaryPeriod: string | null;
  salaryAmount: number | null;
}): ParliamentaryCostPeriod[] {
  const periods = new Set<string>();
  for (const month of input.expenseMonths) {
    if (isPublishedMonthPeriod(month.periodo)) periods.add(month.periodo);
  }
  for (const period of input.staffAmountsByPeriod.keys()) {
    if (isPublishedMonthPeriod(period)) periods.add(period);
  }
  if (input.salaryPeriod && input.salaryAmount !== null && isPublishedMonthPeriod(input.salaryPeriod)) {
    periods.add(input.salaryPeriod);
  }

  return [...periods].sort().map((periodo) => {
    const expense = input.expenseMonths.find((month) => month.periodo === periodo);
    const hasStaff = input.staffAmountsByPeriod.has(periodo);
    return {
      periodo,
      sueldo: periodo === input.salaryPeriod ? input.salaryAmount : null,
      gastos: expense?.total ?? null,
      personal: hasStaff ? input.staffAmountsByPeriod.get(periodo)! : null,
    };
  });
}

export function selectDefaultParliamentCostPeriod(
  months: readonly ParliamentaryCostPeriod[],
  salaryPeriod: string | null,
): string {
  if (
    salaryPeriod &&
    months.some((month) => month.periodo === salaryPeriod && typeof month.sueldo === "number")
  ) {
    return salaryPeriod;
  }

  return latestPublishedPeriod(months.map((month) => month.periodo));
}
