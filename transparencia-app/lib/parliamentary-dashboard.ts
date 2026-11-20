import { procesarGastosPolitico } from "./gastos-operacionales";
import type { EtlRecord } from "./data-source";
import { buildMemberSupport, type SupportMember } from "./party-support";
import type { PersonalApoyoDataset } from "./personal-apoyo";
import { externalAdvisoryAmountsByPeriod } from "./parliamentary-cost-periods";
import { parseSpanishMonthPeriod } from "./month-periods";

export const DASHBOARD_COMPONENTS = { gastos: "Gastos operacionales", personal: "Personal de apoyo", asesorias: "Asesorías externas", dieta: "Dieta de referencia fija" } as const;
export type DashboardComponent = keyof typeof DASHBOARD_COMPONENTS;
export type Chamber = "camara" | "senado";
export interface DashboardMember { id: string; name: string; chamber: Chamber; partyId?: string; partyLabel?: string }
export interface DashboardRow { memberId: string; period: string; component: DashboardComponent; category: string; item: string; amount: number | null; contracts?: number; estimated?: boolean; referencePeriod?: string }
export interface DashboardData { members: DashboardMember[]; rows: DashboardRow[]; releaseId: string | null; mode: "published" | "local-verified" | "unverified"; notes: string[] }
export interface DashboardFilters { chamber: string; member: string; from: string; to: string; component: string; category: string; item: string; memberIds?: string[]; partyIds?: string[]; componentIds?: DashboardComponent[] }
export const DASHBOARD_MIN_PERIOD = "2026-03";
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
  const last = [DASHBOARD_MIN_PERIOD, ...data.rows.map(r => r.period)].sort().at(-1)!;
  return { chamber: "ambas", member: "todos", from: DASHBOARD_MIN_PERIOD, to: last, component: "todos", category: "todas", item: "todos" };
}
export function activeDashboardComponents(f: DashboardFilters): DashboardComponent[] {
  return f.componentIds?.length ? f.componentIds : f.component !== "todos" ? [f.component as DashboardComponent] : Object.keys(DASHBOARD_COMPONENTS) as DashboardComponent[];
}
export function dashboardMembers(data: DashboardData, f: DashboardFilters): DashboardMember[] {
  const ids = f.memberIds?.length ? f.memberIds : f.member !== "todos" ? [f.member] : [];
  return data.members.filter(m => (f.chamber === "ambas" || m.chamber === f.chamber) && (!f.partyIds?.length || f.partyIds.includes(m.partyId ?? "sin-partido")) && (!ids.length || ids.includes(m.id)));
}
export function dashboardFiltersFromParams(params: URLSearchParams, data: DashboardData): DashboardFilters {
  const defaults = dashboardDefaults(data);
  const chamber = ["camara", "senado"].includes(params.get("camara") ?? "") ? params.get("camara")! : "ambas";
  const available = data.members.filter(m => chamber === "ambas" || m.chamber === chamber);
  const partyIds = [...new Set(params.getAll("partido"))].filter(id => available.some(m => (m.partyId ?? "sin-partido") === id));
  const memberIds = [...new Set(params.getAll("parlamentario"))].filter(id => available.some(m => m.id === id && (!partyIds.length || partyIds.includes(m.partyId ?? "sin-partido"))));
  const componentIds = [...new Set(params.getAll("componente"))].filter((id): id is DashboardComponent => Object.hasOwn(DASHBOARD_COMPONENTS, id));
  const member = memberIds.length === 1 ? memberIds[0] : "todos";
  const component = componentIds.length === 1 ? componentIds[0] : "todos";
  const horizon = defaults.to.slice(0, 4) + "-12";
  const from = validDashboardMonth(params.get("desde") ?? "") ? [DASHBOARD_MIN_PERIOD, [params.get("desde")!, horizon].sort()[0]].sort().at(-1)! : defaults.from;
  const to = validDashboardMonth(params.get("hasta") ?? "") ? [DASHBOARD_MIN_PERIOD, [params.get("hasta")!, horizon].sort()[0]].sort().at(-1)! : defaults.to;
  const base = { chamber, member, memberIds, partyIds, component, componentIds, from: from <= to ? from : to, to: from <= to ? to : from, category: "todas", item: "todos" };
  const scoped = filterDashboardRows(data, base);
  const category = scoped.some(r => r.category === params.get("categoria")) ? params.get("categoria")! : "todas";
  const item = scoped.some(r => (category === "todas" || r.category === category) && r.item === params.get("item")) ? params.get("item")! : "todos";
  return { ...base, category, item };
}
export function dashboardParams(filters: DashboardFilters): URLSearchParams {
  const params = new URLSearchParams({ camara: filters.chamber, desde: filters.from, hasta: filters.to, categoria: filters.category, item: filters.item });
  const memberIds = filters.memberIds?.length ? filters.memberIds : filters.member !== "todos" ? [filters.member] : [];
  for (const id of [...new Set(memberIds)]) params.append("parlamentario", id);
  for (const id of [...new Set(filters.partyIds ?? [])]) params.append("partido", id);
  const components = filters.componentIds?.length ? filters.componentIds : filters.component !== "todos" ? [filters.component] : [];
  for (const id of [...new Set(components)]) params.append("componente", id);
  return params;
}
export function filterDashboardRows(data: DashboardData, f: DashboardFilters): DashboardRow[] {
  const ids = new Set(dashboardMembers(data, f).map(m => m.id));
  const components = activeDashboardComponents(f);
  const sourceRows = data.rows.filter(r => r.component !== "dieta" && ids.has(r.memberId));
  const references = dashboardDietReferences(data, f);
  const periods = dashboardTimeline([], f.from, f.to).map(month => month.period);
  const estimated: DashboardRow[] = references.flatMap(reference => periods.map(period => ({ ...reference, period, category: "Dieta referencial fija", item: "Referencia mensual fija", estimated: true, referencePeriod: reference.period })));
  return [...sourceRows, ...estimated].filter(r => r.period >= f.from && r.period <= f.to && components.includes(r.component) && (f.category === "todas" || r.category === f.category) && (f.item === "todos" || r.item === f.item));
}

/** Orden por los dos grupos de apellidos, conservando partículas y compuestos. */
export function dashboardSurname(name: string): { surname: string; given: string; label: string } {
  const words = name.trim().split(/\s+/);
  const start = (end: number) => {
    let i = end;
    while (i > 0 && (/^(de|del|la|las|los|van|von|y)$/i.test(words[i - 1]) || /-(van|von)$/i.test(words[i - 1]))) {
      i -= words[i - 1].toLowerCase() === "y" && i > 1 ? 2 : 1;
    }
    return i;
  };
  const maternal = start(words.length - 1);
  const paternal = maternal > 0 ? start(maternal - 1) : 0;
  const first = paternal > 0 ? paternal : maternal > 0 ? maternal : 0;
  const surname = words.slice(first).join(" "), given = words.slice(0, first).join(" ");
  return { surname, given, label: given ? `${surname}, ${given}` : surname };
}
export function compareDashboardMembers(a: DashboardMember, b: DashboardMember): number {
  return dashboardSurname(a.name).surname.localeCompare(dashboardSurname(b.name).surname, "es") || a.name.localeCompare(b.name, "es");
}
export function dashboardComparisonGroups(data: DashboardData, f: DashboardFilters, dimension: "member" | "party") {
  const members = dashboardMembers(data, f), rows = filterDashboardRows(data, f);
  const groups = new Map<string, { id: string; label: string; memberIds: Set<string>; rows: DashboardRow[] }>();
  for (const m of [...members].sort(compareDashboardMembers)) {
    const id = dimension === "member" ? m.id : m.partyId ?? "sin-partido";
    const group = groups.get(id) ?? { id, label: dimension === "member" ? m.name : m.partyLabel ?? "Sin partido incorporado", memberIds: new Set<string>(), rows: [] };
    group.memberIds.add(m.id); groups.set(id, group);
  }
  const memberToGroup = new Map(members.map(m => [m.id, dimension === "member" ? m.id : m.partyId ?? "sin-partido"]));
  for (const row of rows) groups.get(memberToGroup.get(row.memberId)!)?.rows.push(row);
  return [...groups.values()].map(g => ({ ...g, members: g.memberIds.size, summary: summarizeDashboardRows(g.rows) }));
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
  const lines = [["Cámara", "Parlamentario", "Período", "Componente", "Categoría de lectura", "Ítem", "Monto CLP", "Contratos", "Partido de nómina vigente", "Estado del importe", "Release", "Tipo de importe", "Mes de referencia"].map(cell).join(";")];
  for (const r of rows) {
    const m = members.get(r.memberId)!;
    lines.push([cell(m.chamber === "camara" ? "Diputados" : "Senado"), cell(m.name), cell(r.period), cell(DASHBOARD_COMPONENTS[r.component]), cell(r.category), cell(r.item), r.amount === null ? "" : String(r.amount), r.contracts === undefined ? "" : String(r.contracts), cell(m.partyLabel ?? "Sin partido incorporado"), cell(r.estimated ? "Estimación por dieta fija" : r.amount === null ? "Sin importe publicado" : "Publicado"), cell(data.releaseId ?? "sin verificar"), cell(r.estimated ? "Referencia aplicada" : "Registro incorporado"), cell(r.referencePeriod ?? "")].join(";"));
  }
  return "\uFEFF" + lines.join("\r\n");
}

/** Última referencia oficial positiva por persona; no modifica ni duplica el dataset. */
export function dashboardDietReferences(data: DashboardData, filters: DashboardFilters): DashboardRow[] {
  const ids = new Set(dashboardMembers(data, filters).map(member => member.id));
  const grouped = new Map<string, DashboardRow[]>();
  for (const row of data.rows) {
    if (row.component !== "dieta" || !ids.has(row.memberId) || !validDashboardMonth(row.period) || row.amount === null || !Number.isSafeInteger(row.amount) || row.amount <= 0) continue;
    const current = grouped.get(row.memberId) ?? [];
    if (!current.length || row.period > current[0].period) grouped.set(row.memberId, [row]);
    else if (row.period === current[0].period) current.push(row);
  }
  return [...grouped.values()].flatMap(rows => new Set(rows.map(row => row.amount)).size === 1 ? [rows[0]] : []);
}

/** Tarjetas de cohorte/rango; la dieta se replica como estimación fija en cada mes. */
export function dashboardHeadlineMetrics(data: DashboardData, filters: DashboardFilters) {
  const references = dashboardDietReferences(data, filters);
  const contextRows = filterDashboardRows(data, { ...filters, component: "todos", componentIds: [], category: "todas", item: "todos" });
  const summary = summarizeDashboardRows(contextRows);
  const amounts = Object.values(summary).map(value => value.amount);
  const total = amounts.some(value => value !== null) ? amounts.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null;
  return { summary, total, referencePeriods: [...new Set(references.map(row => row.period))].sort(), referenceCount: references.length, referenceMonthlyAmount: references.length ? references.reduce((sum, row) => sum + row.amount!, 0) : null, appliedMonths: dashboardTimeline([], filters.from, filters.to).length, members: dashboardMembers(data, filters).length };
}
