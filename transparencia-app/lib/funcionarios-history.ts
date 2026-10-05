import type { FuncionarioPublico } from "./funcionarios";

export interface FuncionarioSalaryHistoryPoint {
  periodo: string;
  etiqueta: string;
  bruto: number | null;
  liquido: number | null;
  horasExtras: number | null;
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

/** History of one published record, never an identity inferred from a shared name. */
export function buildFuncionarioSalaryHistory(
  records: FuncionarioPublico[], targetName: string, targetId?: string,
): FuncionarioSalaryHistoryPoint[] {
  const target = targetId ? "" : normalizeName(targetName);
  const named = targetId
    ? records.filter(row => row.id === targetId)
    : records.filter(row => normalizeName(row.nombre_completo) === target);
  const ids = new Set(named.map(row => row.id).filter(Boolean));
  const id = targetId ?? (ids.size === 1 ? [...ids][0] : undefined);
  if (!id) return [];
  const grouped = new Map<string, FuncionarioPublico[]>();
  const seen = new Set<string>();
  for (const row of named) {
    if (row.id !== id) continue;
    const period = String(row.fuente_periodo ?? row.periodo ?? "").trim();
    if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(period)) continue;
    const signature = JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b))));
    if (seen.has(signature)) continue;
    seen.add(signature);
    grouped.set(period, [...(grouped.get(period) ?? []), row]);
  }
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([periodo, rows]) => {
    const row = rows[0];
    const conflict = rows.length > 1;
    const value = (amount: unknown) => !conflict && typeof amount === "number" && Number.isFinite(amount) ? amount : null;
    return {
      periodo, etiqueta: periodLabel(periodo),
      bruto: value(row.remuneracion_bruta_mensual),
      liquido: value(row.remuneracion_liquida_mensual),
      horasExtras: conflict ? null : Number(row.horas_extras_mes_anterior ?? 0),
      montoHorasExtras: value(row.monto_horas_extras_clp),
      registros: rows.length,
    };
  });
}
