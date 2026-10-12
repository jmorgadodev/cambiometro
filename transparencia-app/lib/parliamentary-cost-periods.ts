import { isPublishedMonthPeriod, latestPublishedPeriod, parseSpanishMonthPeriod } from "@/lib/month-periods";

export interface ExpenseMonthAmount {
  periodo: string;
  total: number;
}

export interface ParliamentaryCostPeriod {
  periodo: string;
  sueldo: number | null;
  gastos: number | null;
  personal: number | null;
  asesorias: number | null;
}

export function parsePublishedClpAmount(value: string | null | undefined): number | null {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount : null;
}

export function externalAdvisoryAmountsByPeriod(
  periods: readonly { period: string; rows: readonly { values: Record<string, string> }[] }[],
): Map<string, number> {
  const amounts = new Map<string, number>();
  for (const period of periods) {
    const isoPeriod = parseSpanishMonthPeriod(period.period);
    if (!isoPeriod || period.rows.length === 0) continue;
    const rowAmounts = period.rows.map(({ values }) => parsePublishedClpAmount(values.Monto));
    if (rowAmounts.some((amount) => amount === null)) continue;
    amounts.set(isoPeriod, rowAmounts.reduce<number>((total, amount) => total + (amount ?? 0), 0));
  }
  return amounts;
}

export function buildParliamentCostPeriods(input: {
  expenseMonths: readonly ExpenseMonthAmount[];
  staffAmountsByPeriod: ReadonlyMap<string, number>;
  advisoryAmountsByPeriod?: ReadonlyMap<string, number>;
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
  for (const period of input.advisoryAmountsByPeriod?.keys() ?? []) {
    if (isPublishedMonthPeriod(period)) periods.add(period);
  }
  if (input.salaryPeriod && input.salaryAmount !== null && isPublishedMonthPeriod(input.salaryPeriod)) {
    periods.add(input.salaryPeriod);
  }

  return [...periods].sort().map((periodo) => {
    const expense = input.expenseMonths.find((month) => month.periodo === periodo);
    const hasStaff = input.staffAmountsByPeriod.has(periodo);
    const hasAdvisories = input.advisoryAmountsByPeriod?.has(periodo) ?? false;
    return {
      periodo,
      sueldo: periodo === input.salaryPeriod ? input.salaryAmount : null,
      gastos: expense?.total ?? null,
      personal: hasStaff ? input.staffAmountsByPeriod.get(periodo)! : null,
      asesorias: hasAdvisories ? input.advisoryAmountsByPeriod?.get(periodo) ?? null : null,
    };
  });
}

export function selectDefaultParliamentCostPeriod(
  months: readonly ParliamentaryCostPeriod[],
): string {
  return latestPublishedPeriod(months.map((month) => month.periodo));
}
