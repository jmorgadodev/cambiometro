type PeriodEvidence = {
  desde?: string;
  hasta?: string;
};

function boundaryDate(value: string | undefined, endOfPeriod: boolean): Date | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  if (/^\d{4}$/.test(normalized)) {
    const year = Number(normalized);
    return new Date(Date.UTC(year, endOfPeriod ? 11 : 0, endOfPeriod ? 31 : 1));
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const parsed = new Date(`${normalized}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function currentParliamentaryPeriod(
  periods: PeriodEvidence[] | undefined,
  referenceDate = new Date(),
): string | null {
  const active = (periods ?? [])
    .map((period) => ({
      start: boundaryDate(period.desde, false),
      end: boundaryDate(period.hasta, true),
    }))
    .filter(
      (period): period is { start: Date; end: Date } =>
        Boolean(period.start && period.end) &&
        period.start!.getTime() <= referenceDate.getTime() &&
        period.end!.getTime() >= referenceDate.getTime(),
    )
    .sort((left, right) => right.start.getTime() - left.start.getTime())[0];

  if (!active) return null;
  return `${active.start.getUTCFullYear()}–${active.end.getUTCFullYear()}`;
}
