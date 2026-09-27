export type ExpenseSourceId = "gastos_camara" | "gastos_senado";

export interface ExpenseApiRecord {
  id: string;
  sourceId: ExpenseSourceId;
  title?: string | null;
  description?: string | null;
  occurredAt?: string | null;
  period?: { periodo?: string | null } | null;
  amount?: { amountClp?: number | null } | null;
  evidence?: { url?: string | null; fuente?: string | null } | null;
  data?: {
    nombre?: string | null;
    fecha?: string | null;
    periodo?: string | null;
    item?: string | null;
    monto_clp?: number | null;
    url?: string | null;
    fuente?: string | null;
  } | null;
}

export interface PublicExpenseRow {
  id: string;
  sourceId: ExpenseSourceId;
  nombre: string;
  fecha: string;
  periodo: string;
  item: string;
  monto_clp: number | null;
  url: string;
  fuente?: string;
}

export type ExpenseOffsets = Record<ExpenseSourceId, number>;

function periodOrdinal(period: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return null;
  const [year, month] = period.split("-").map(Number);
  return year * 12 + month - 1;
}

export function getPublishedPeriodRange(periods: readonly string[]) {
  const ordered = [...new Set(periods)].sort();
  if (!ordered.length) return null;
  const ordinals = ordered.map(periodOrdinal);
  if (ordinals.some((ordinal) => ordinal === null)) return null;
  for (let index = 1; index < ordinals.length; index += 1) {
    if (ordinals[index] !== ordinals[index - 1]! + 1) return null;
  }
  return { from: ordered[0], to: ordered.at(-1)! };
}

export function getPublishedPeriodDateRange(periods: readonly string[]) {
  const range = getPublishedPeriodRange(periods);
  if (!range) return null;
  const [year, month] = range.to.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { from: `${range.from}-01`, to: lastDay };
}

export function isPublishedPeriod(periods: readonly string[], period: string) {
  return periods.includes(period);
}

export function mapExpenseApiRecord(record: ExpenseApiRecord): PublicExpenseRow {
  const fecha = record.data?.fecha ?? record.occurredAt ?? "";
  return {
    id: record.id,
    sourceId: record.sourceId,
    nombre: record.data?.nombre ?? record.description ?? "",
    fecha,
    periodo: record.data?.periodo ?? record.period?.periodo ?? fecha.slice(0, 7),
    item: record.data?.item ?? record.title ?? "",
    monto_clp: record.data?.monto_clp ?? record.amount?.amountClp ?? null,
    url: record.data?.url ?? record.evidence?.url ?? "",
    fuente: record.data?.fuente ?? record.evidence?.fuente ?? undefined,
  };
}

export function mergeExpenseSourcePages(
  sourcePages: readonly (readonly PublicExpenseRow[])[],
  limit: number,
): { rows: PublicExpenseRow[]; consumedBySource: ExpenseOffsets } {
  const rows = sourcePages.flat().sort((left, right) =>
    right.fecha.localeCompare(left.fecha) || right.id.localeCompare(left.id),
  ).slice(0, limit);
  const consumedBySource: ExpenseOffsets = { gastos_camara: 0, gastos_senado: 0 };
  for (const row of rows) consumedBySource[row.sourceId] += 1;
  return { rows, consumedBySource };
}

export function advanceExpenseOffsets(current: ExpenseOffsets, consumed: ExpenseOffsets): ExpenseOffsets {
  return {
    gastos_camara: current.gastos_camara + consumed.gastos_camara,
    gastos_senado: current.gastos_senado + consumed.gastos_senado,
  };
}
