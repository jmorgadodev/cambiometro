const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function isPublishedMonthPeriod(period: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

export function publishedMonthPeriods(periods: readonly string[]): string[] {
  return [...new Set(periods.filter(isPublishedMonthPeriod))].sort((left, right) => right.localeCompare(left));
}

export function latestPublishedPeriod(periods: readonly string[]): string {
  return publishedMonthPeriods(periods)[0] ?? "";
}

export function availablePeriodYears(periods: readonly string[]): string[] {
  return [...new Set(publishedMonthPeriods(periods).map((period) => period.slice(0, 4)))];
}

export function periodsForYear(periods: readonly string[], year: string): string[] {
  return publishedMonthPeriods(periods).filter((period) => period.startsWith(`${year}-`));
}

export function formatPublishedMonth(period: string): string {
  if (!isPublishedMonthPeriod(period)) return period;
  const month = Number(period.slice(5, 7));
  return `${MONTH_LABELS[month - 1]} ${period.slice(0, 4)}`;
}

/** Parses explicit Spanish month-year labels without guessing a missing year. */
export function parseSpanishMonthPeriod(label: string | null | undefined): string {
  const normalized = (label ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es-CL");
  const iso = normalized.match(/^(\d{4})-(\d{2})$/);
  if (iso) return isPublishedMonthPeriod(`${iso[1]}-${iso[2]}`) ? `${iso[1]}-${iso[2]}` : "";

  const named = normalized.match(/^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(\d{4})$/);
  if (!named) return "";
  const month = MONTH_LABELS.findIndex((value) => value.toLocaleLowerCase("es-CL") === named[1]) + 1;
  const period = `${named[2]}-${String(month).padStart(2, "0")}`;
  return isPublishedMonthPeriod(period) ? period : "";
}
