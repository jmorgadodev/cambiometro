const DAY_MS = 86_400_000;
const EFFECTIVE_MOVEMENT_STATES = new Set(["verificado", "verificado_oficial", "corroborado"]);

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

export function latestEffectiveMovementDate(movements: unknown): string | null {
  if (!Array.isArray(movements)) return null;

  const dates = movements.flatMap((movement) => {
    if (!movement || typeof movement !== "object") return [];
    const record = movement as { fecha?: unknown; estado?: unknown };
    if (typeof record.fecha !== "string" || typeof record.estado !== "string") return [];
    const date = record.fecha.slice(0, 10);
    if (!EFFECTIVE_MOVEMENT_STATES.has(record.estado) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    const parsed = Date.parse(`${date}T00:00:00Z`);
    if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== date) return [];
    return [date];
  });

  return dates.sort().at(-1) ?? null;
}
