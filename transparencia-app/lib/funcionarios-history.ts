import type { FuncionarioPublico } from "./funcionarios";

export interface FuncionarioSalaryHistoryPoint {
  periodo: string;
  etiqueta: string;
  bruto: number;
  liquido: number | null;
  horasExtras: number;
  montoHorasExtras: number | null;
  registros: number;
}

function normalizeName(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CL")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function periodLabel(periodo: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(periodo);
  if (!match) return periodo;
  const month = Number(match[2]);
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${months[month - 1] ?? match[2]} ${match[1]}`;
}

/**
 * Agrupa todas las nóminas cargadas para una persona, conservando cada corte.
 * Si existen varias filas en un mismo mes, se suman porque representan contratos
 * o conceptos separados de la misma persona en ese corte.
 */
export function buildFuncionarioSalaryHistory(
  records: FuncionarioPublico[],
  targetName: string,
): FuncionarioSalaryHistoryPoint[] {
  const target = normalizeName(targetName);
  if (!target) return [];

  const grouped = new Map<string, {
    bruto: number;
    liquido: number;
    hasLiquido: boolean;
    horasExtras: number;
    montoHorasExtras: number;
    hasMontoHorasExtras: boolean;
    registros: number;
  }>();

  for (const record of records) {
    if (normalizeName(record.nombre_completo) !== target) continue;
    const periodo = String(record.fuente_periodo ?? record.periodo ?? "").trim();
    if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(periodo)) continue;
    const current = grouped.get(periodo) ?? {
      bruto: 0,
      liquido: 0,
      hasLiquido: false,
      horasExtras: 0,
      montoHorasExtras: 0,
      hasMontoHorasExtras: false,
      registros: 0,
    };
    current.bruto += Number(record.remuneracion_bruta_mensual ?? 0) || 0;
    if (record.remuneracion_liquida_mensual !== null && record.remuneracion_liquida_mensual !== undefined) {
      current.liquido += Number(record.remuneracion_liquida_mensual) || 0;
      current.hasLiquido = true;
    }
    current.horasExtras += Number(record.horas_extras_mes_anterior ?? 0) || 0;
    if (record.monto_horas_extras_clp !== null && record.monto_horas_extras_clp !== undefined) {
      current.montoHorasExtras += Number(record.monto_horas_extras_clp) || 0;
      current.hasMontoHorasExtras = true;
    }
    current.registros += 1;
    grouped.set(periodo, current);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([periodo, value]) => ({
      periodo,
      etiqueta: periodLabel(periodo),
      bruto: Math.round(value.bruto),
      liquido: value.hasLiquido ? Math.round(value.liquido) : null,
      horasExtras: Number(value.horasExtras.toFixed(2)),
      montoHorasExtras: value.hasMontoHorasExtras ? Math.round(value.montoHorasExtras) : null,
      registros: value.registros,
    }));
}
