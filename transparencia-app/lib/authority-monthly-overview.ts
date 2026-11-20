import type { ParliamentaryCostPeriod } from "./parliamentary-cost-periods";
import { isPublishedMonthPeriod } from "./month-periods";
export type AuthorityOverviewMonth = Pick<ParliamentaryCostPeriod, "periodo" | "gastos" | "personal">;
/** Proyecta los mismos importes de la ficha, sin completar ni acumular meses. */
export function authorityOverviewMonths(months: readonly AuthorityOverviewMonth[], year = 2026): AuthorityOverviewMonth[] {
  return months.filter(month => isPublishedMonthPeriod(month.periodo) && month.periodo.startsWith(`${year}-`) && [month.gastos, month.personal].some(value => typeof value === "number" && Number.isSafeInteger(value)))
    .map(month => ({ periodo: month.periodo, gastos: typeof month.gastos === "number" && Number.isSafeInteger(month.gastos) ? month.gastos : null, personal: typeof month.personal === "number" && Number.isSafeInteger(month.personal) ? month.personal : null }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
}

export function authorityOverviewYears(months: readonly AuthorityOverviewMonth[]): number[] {
  return [...new Set([2026, ...months.filter(month => isPublishedMonthPeriod(month.periodo) && [month.gastos, month.personal].some(value => typeof value === "number" && Number.isSafeInteger(value))).map(month => Number(month.periodo.slice(0, 4)))])].sort((a, b) => b - a);
}
