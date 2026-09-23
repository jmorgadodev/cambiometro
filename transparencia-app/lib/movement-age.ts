const DAY_MS = 86_400_000;

export function getChileDateKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function daysSinceCalendarDate(eventDate: string, todayDate = getChileDateKey()): number {
  const eventDay = Date.parse(`${eventDate.slice(0, 10)}T00:00:00Z`);
  const today = Date.parse(`${todayDate.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(eventDay) || !Number.isFinite(today)) return 0;
  return Math.max(0, Math.floor((today - eventDay) / DAY_MS));
}
