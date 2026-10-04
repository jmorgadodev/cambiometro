export interface AlcaldiaRow {
  id?: string;
  nombre?: string;
  nombre_completo?: string;
  cargo?: string | null;
  estamento?: string | null;
  periodo?: string | null;
  fuente_periodo?: string | null;
  fecha_termino?: string | null;
}

export function isAlcaldiaRole(row: AlcaldiaRow): boolean {
  const cargo = String(row.cargo ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return /^(?:alcaldia\s+)?alcalde(?:sa)?$/.test(cargo);
}

export function selectPublishedAlcaldia<T extends AlcaldiaRow>(rows: readonly T[], period: string | null | undefined): T | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period ?? "")) return null;
  const candidates = rows.filter(row => isAlcaldiaRole(row)
    && (row.periodo ?? row.fuente_periodo) === period
    && Boolean(row.nombre ?? row.nombre_completo)
    && !(row.fecha_termino && /^\d{4}-\d{2}-\d{2}$/.test(row.fecha_termino) && row.fecha_termino < `${period}-01`));
  // Exact duplicate rows only: a shared name is not an identity key.
  const unique = new Map(candidates.map(row => [JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b)))), row]));
  return unique.size === 1 ? [...unique.values()][0] : null;
}

export function resolvePublishedAlcaldia<T extends AlcaldiaRow>(data: {
  alcalde?: T | null;
  periodo_cplt_reciente?: string | null;
  alcaldia_registros?: T[];
  top_remuneraciones_por_periodo?: Record<string, T[]>;
  periodos_disponibles?: Array<{ periodo: string }>;
}): T | null {
  const period = [data.periodo_cplt_reciente, ...(data.periodos_disponibles ?? []).map(item => item.periodo)]
    .filter((value): value is string => /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? "")).sort().at(-1);
  if (data.alcaldia_registros) return selectPublishedAlcaldia(data.alcaldia_registros, period);
  // Legacy aggregates contain a partial top-five list. This is an observed payroll
  // record, never proof of legal incumbency or complete coverage of the office.
  const observed = data.top_remuneraciones_por_periodo?.[period ?? ""]?.filter(isAlcaldiaRole) ?? [];
  return selectPublishedAlcaldia(observed.length ? observed : data.alcalde ? [data.alcalde] : [], period);
}
