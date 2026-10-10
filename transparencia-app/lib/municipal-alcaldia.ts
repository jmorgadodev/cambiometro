export interface AlcaldiaRow {
  id?: string;
  nombre?: string;
  nombre_completo?: string;
  cargo?: string | null;
  estamento?: string | null;
  periodo?: string | null;
  fuente_periodo?: string | null;
  fecha_termino?: string | null;
  remuneracion_bruta?: number | null;
  remuneracion_liquida?: number | null;
  grado_eus?: string | null;
  formacion?: string | null;
  fecha_ingreso?: string | null;
  fuente?: string | null;
}

export function latestPublishedPayrollPeriod(data: { periodo_cplt_reciente?: string | null; periodos_disponibles?: Array<{ periodo: string }> }): string | null {
  return [data.periodo_cplt_reciente, ...(data.periodos_disponibles ?? []).map(item => item.periodo)]
    .filter((value): value is string => /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? "")).sort().at(-1) ?? null;
}

export function payrollMonthsBehind(period: string | null | undefined, today = new Date()): number | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period ?? "")) return null;
  const current = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit" }).formatToParts(today);
  const year = Number(current.find(part => part.type === "year")?.value);
  const month = Number(current.find(part => part.type === "month")?.value);
  const [sourceYear, sourceMonth] = period!.split("-").map(Number);
  return Math.max(0, (year - sourceYear) * 12 + month - sourceMonth);
}

export function isAlcaldiaRole(row: AlcaldiaRow): boolean {
  const cargo = String(row.cargo ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return /^(?:alcaldia\s+)?alcalde(?:sa)?$/.test(cargo);
}

export function selectPublishedAlcaldia<T extends AlcaldiaRow>(rows: readonly T[], period: string | null | undefined): T | null {
  const candidates = alcaldiaCandidates(rows, period);
  if (!candidates.length) return null;
  // Exact duplicate rows only: a shared name is not an identity key.
  const unique = new Map(candidates.map(row => [JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b)))), row]));
  return unique.size === 1 ? [...unique.values()][0] : null;
}

function alcaldiaCandidates<T extends AlcaldiaRow>(rows: readonly T[], period: string | null | undefined): T[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period ?? "")) return [];
  return rows.filter(row => isAlcaldiaRole(row)
    && (row.periodo ?? row.fuente_periodo) === period
    && Boolean(row.nombre ?? row.nombre_completo)
    && !(row.fecha_termino && /^\d{4}-\d{2}-\d{2}$/.test(row.fecha_termino) && row.fecha_termino < `${period}-01`));
}

export function getAlcaldiaPayrollStatus<T extends AlcaldiaRow, U extends AlcaldiaRow = T>(data: {
  alcalde?: T | null;
  periodo_cplt_reciente?: string | null;
  alcaldia_registros?: T[];
  top_remuneraciones_por_periodo?: Record<string, U[]>;
  periodos_disponibles?: Array<{ periodo: string }>;
}, selectedPeriod?: string): "unico" | "multiple" | "sin_registro" {
  const period = selectedPeriod ?? [data.periodo_cplt_reciente, ...(data.periodos_disponibles ?? []).map(item => item.periodo)]
    .filter((value): value is string => /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? "")).sort().at(-1);
  const observed: readonly AlcaldiaRow[] = data.alcaldia_registros
    ?? (data.top_remuneraciones_por_periodo?.[period ?? ""]?.filter(isAlcaldiaRole) ?? (data.alcalde ? [data.alcalde] : []));
  const candidates = alcaldiaCandidates(observed, period);
  const unique = new Map(candidates.map(row => [JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b)))), row]));
  return unique.size === 0 ? "sin_registro" : unique.size === 1 ? "unico" : "multiple";
}

export function resolvePublishedAlcaldia<T extends AlcaldiaRow, U extends AlcaldiaRow = T>(data: {
  alcalde?: T | null;
  periodo_cplt_reciente?: string | null;
  alcaldia_registros?: T[];
  top_remuneraciones_por_periodo?: Record<string, U[]>;
  periodos_disponibles?: Array<{ periodo: string }>;
}, selectedPeriod?: string): T | U | null {
  const period = selectedPeriod ?? [data.periodo_cplt_reciente, ...(data.periodos_disponibles ?? []).map(item => item.periodo)]
    .filter((value): value is string => /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? "")).sort().at(-1);
  if (data.alcaldia_registros) return selectPublishedAlcaldia(data.alcaldia_registros, period);
  // Legacy aggregates contain a partial top-five list. This is an observed payroll
  // record, never proof of legal incumbency or complete coverage of the office.
  const observed = data.top_remuneraciones_por_periodo?.[period ?? ""]?.filter(isAlcaldiaRole) ?? [];
  const selectedObserved = selectPublishedAlcaldia<U>(observed, period);
  if (selectedObserved) return selectedObserved;
  return data.alcalde ? selectPublishedAlcaldia([data.alcalde], period) : null;
}
