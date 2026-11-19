import { procesarGastosPolitico } from "./gastos-operacionales";
import type { EtlRecord } from "./data-source";
import { buildMemberSupport, type SupportMember } from "./party-support";
import type { PersonalApoyoDataset } from "./personal-apoyo";
import { externalAdvisoryAmountsByPeriod } from "./parliamentary-cost-periods";
import { parseSpanishMonthPeriod } from "./month-periods";

export const DASHBOARD_COMPONENTS = { gastos: "Gastos operacionales", personal: "Personal de apoyo", asesorias: "Asesorías externas", dieta: "Dieta oficial de referencia" } as const;
export type DashboardComponent = keyof typeof DASHBOARD_COMPONENTS;
export type Chamber = "camara" | "senado";
export interface DashboardMember { id: string; name: string; chamber: Chamber }
export interface DashboardRow { memberId: string; period: string; component: DashboardComponent; category: string; item: string; amount: number | null; contracts?: number }
export interface DashboardData { members: DashboardMember[]; rows: DashboardRow[]; releaseId: string | null; mode: "published" | "local-verified" | "unverified"; notes: string[] }
export interface DashboardFilters { chamber: string; member: string; from: string; to: string; component: string; category: string; item: string }
export const validDashboardMonth = (p: string) => /^20[2-9]\d-(0[1-9]|1[0-2])$/.test(p) && p >= "2026-01";

/** Agrupación de lectura; el ítem original siempre se conserva. */
export function expenseReadingCategory(item: string): string {
  const key = item.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/trasla|pasaj|viaj|combust|vehicul|peaj/.test(key)) return "Traslados";
  if (/oficina|arriend|servicio|telefon|internet|consumo/.test(key)) return "Oficinas y servicios";
  if (/comunidad|difusion|comunic|actividad/.test(key)) return "Actividad y comunicación";
  return "Otros ítems operacionales";
}

export function buildDashboardRows(input: {
  members: readonly SupportMember[];
  expenses: ReadonlyMap<string, EtlRecord[]>;
  staff: PersonalApoyoDataset | null;
  salaries: ReadonlyMap<string, { amount: number; period: string }>;
}): DashboardRow[] {
  const rows: DashboardRow[] = [];
  const support = buildMemberSupport(input.members, input.staff, "2026-01");
  for (const member of input.members) {
    for (const month of procesarGastosPolitico(input.expenses.get(member.id) ?? []).meses) {
      if (!validDashboardMonth(month.periodo)) continue;
      const items = month.items.length ? month.items : [{ item: "Total publicado sin desglose", monto: month.total }];
      for (const item of items) rows.push({ memberId: member.id, period: month.periodo, component: "gastos", category: expenseReadingCategory(item.item), item: item.item, amount: item.monto });
    }
    for (const [period, snapshot] of Object.entries(support[member.id] ?? {})) {
      if (validDashboardMonth(period)) rows.push({ memberId: member.id, period, component: "personal", category: "Personal de apoyo", item: "Nómina mensual", amount: snapshot.amount, contracts: snapshot.contracts });
    }
    const section = member.deputyId ? input.staff?.diputados[member.deputyId]?.transparencia_camara?.asesorias_externas : null;
    const periods = section?.periods ?? (section?.period && ["available", "empty_confirmed"].includes(section.status) ? [{ period: section.period, status: section.status, rows: section.rows }] : []);
    const advisoryAmounts = externalAdvisoryAmountsByPeriod(periods);
    for (const snapshot of periods) {
      const period = parseSpanishMonthPeriod(snapshot.period);
      if (!period || !validDashboardMonth(period) || !["available", "empty_confirmed"].includes(snapshot.status)) continue;
      const amount = snapshot.status === "empty_confirmed" && !snapshot.rows.length ? 0 : advisoryAmounts.get(period) ?? null;
      rows.push({ memberId: member.id, period, component: "asesorias", category: "Asesorías externas", item: "Contratos externos", amount, contracts: snapshot.rows.length });
    }
    const salary = input.salaries.get(member.id);
    if (salary && validDashboardMonth(salary.period) && Number.isSafeInteger(salary.amount) && salary.amount > 0) rows.push({ memberId: member.id, period: salary.period, component: "dieta", category: "Dieta oficial", item: "Última referencia oficial", amount: salary.amount });
  }
  return rows;
}

export function dashboardDefaults(data: DashboardData): DashboardFilters {
  const last = data.rows.map(r => r.period).sort().at(-1) ?? "2026-01";
  return { chamber: "ambas", member: "todos", from: "2026-01", to: last, component: "todos", category: "todas", item: "todos" };
}
export function dashboardFiltersFromParams(params: URLSearchParams, data: DashboardData): DashboardFilters {
  const defaults = dashboardDefaults(data);
  const chamber = ["camara", "senado"].includes(params.get("camara") ?? "") ? params.get("camara")! : "ambas";
  const member = data.members.find(m => m.id === params.get("parlamentario") && (chamber === "ambas" || m.chamber === chamber))?.id ?? "todos";
  const component = Object.hasOwn(DASHBOARD_COMPONENTS, params.get("componente") ?? "") ? params.get("componente")! : "todos";
  const horizon = defaults.to.slice(0, 4) + "-12";
  const from = validDashboardMonth(params.get("desde") ?? "") ? [params.get("desde")!, horizon].sort()[0] : defaults.from;
  const to = validDashboardMonth(params.get("hasta") ?? "") ? [params.get("hasta")!, horizon].sort()[0] : defaults.to;
  const base = { chamber, member, component, from: from <= to ? from : to, to: from <= to ? to : from, category: "todas", item: "todos" };
  const scoped = filterDashboardRows(data, base);
  const category = scoped.some(r => r.category === params.get("categoria")) ? params.get("categoria")! : "todas";
  const item = scoped.some(r => (category === "todas" || r.category === category) && r.item === params.get("item")) ? params.get("item")! : "todos";
  return { ...base, category, item };
}
export function dashboardParams(filters: DashboardFilters): URLSearchParams {
  return new URLSearchParams({ camara: filters.chamber, parlamentario: filters.member, desde: filters.from, hasta: filters.to, componente: filters.component, categoria: filters.category, item: filters.item });
}
export function filterDashboardRows(data: DashboardData, f: DashboardFilters): DashboardRow[] {
  const ids = new Set(data.members.filter(m => (f.chamber === "ambas" || m.chamber === f.chamber) && (f.member === "todos" || m.id === f.member)).map(m => m.id));
  return data.rows.filter(r => ids.has(r.memberId) && r.period >= f.from && r.period <= f.to && (f.component === "todos" || r.component === f.component) && (f.category === "todas" || r.category === f.category) && (f.item === "todos" || r.item === f.item));
}
export function summarizeDashboardRows(rows: readonly DashboardRow[]) {
  const components = Object.keys(DASHBOARD_COMPONENTS) as DashboardComponent[];
  return Object.fromEntries(components.map(component => {
    const selected = rows.filter(r => r.component === component);
    const known = selected.filter(r => r.amount !== null);
    return [component, { amount: known.length ? known.reduce((s, r) => s + r.amount!, 0) : null, members: new Set(known.map(r => r.memberId)).size, months: new Set(known.map(r => r.period)).size, missing: selected.filter(r => r.amount === null).length }];
  })) as Record<DashboardComponent, { amount: number | null; members: number; months: number; missing: number }>;
}
export function dashboardTimeline(rows: readonly DashboardRow[], from: string, to: string) {
  const timeline: { period: string; values: ReturnType<typeof summarizeDashboardRows> }[] = [];
  if (!validDashboardMonth(from) || !validDashboardMonth(to) || from > to) return timeline;
  let cursor = from;
  // UI ranges are bounded to avoid an unbounded empty chart from a hand-edited URL.
  while (cursor <= to && timeline.length < 120) {
    timeline.push({ period: cursor, values: summarizeDashboardRows(rows.filter(r => r.period === cursor)) });
    const year = Number(cursor.slice(0, 4)), month = Number(cursor.slice(5));
    cursor = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  }
  return timeline;
}
export function dashboardCsv(data: DashboardData, rows: readonly DashboardRow[]): string {
  const members = new Map(data.members.map(m => [m.id, m]));
  const cell = (s: string) => '"' + (/^[=+@\-\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"';
  const lines = [["Cámara", "Parlamentario", "Período", "Componente", "Categoría de lectura", "Ítem", "Monto CLP", "Contratos", "Release"].map(cell).join(";")];
  for (const r of rows) {
    const m = members.get(r.memberId)!;
    lines.push([cell(m.chamber === "camara" ? "Diputados" : "Senado"), cell(m.name), cell(r.period), cell(DASHBOARD_COMPONENTS[r.component]), cell(r.category), cell(r.item), r.amount === null ? "" : String(r.amount), r.contracts === undefined ? "" : String(r.contracts), cell(data.releaseId ?? "sin verificar")].join(";"));
  }
  return "\uFEFF" + lines.join("\r\n");
}
