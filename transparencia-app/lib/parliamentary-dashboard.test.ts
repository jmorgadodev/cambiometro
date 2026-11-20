import { describe, it, expect } from "vitest";
import { buildDashboardRows, dashboardDefaults, dashboardFiltersFromParams, dashboardTimeline, dashboardCsv, filterDashboardRows, summarizeDashboardRows, type DashboardData } from "./parliamentary-dashboard";
import type { PersonalApoyoDataset } from "./personal-apoyo";
const members = [{ id: "d", cargo: "Diputado", nombre_completo: "Ana Perez Soto", deputyId: "10" }, { id: "s", cargo: "Senador", nombre_completo: "Miguel Becker Alvear", deputyId: null }];
const data: DashboardData = { mode: "local-verified", releaseId: "release", notes: [], members: [{ id: "d", name: "Ana", chamber: "camara" }, { id: "s", name: "Miguel", chamber: "senado" }], rows: [{ memberId: "d", period: "2026-03", component: "gastos", category: "Oficinas", item: "Arriendo", amount: 100 }, { memberId: "s", period: "2026-05", component: "gastos", category: "Traslados", item: "Pasaje", amount: -10 }, { memberId: "d", period: "2026-03", component: "personal", category: "Apoyo", item: "Nómina", amount: null }, { memberId: "s", period: "2026-03", component: "personal", category: "Apoyo", item: "Nómina", amount: 0 }] };
describe("dashboard con períodos y componentes publicados", () => {
  it("no suma TOTAL otra vez, conserva ajustes negativos y la dieta sólo en su mes", () => {
    const rows = buildDashboardRows({ members, staff: null, salaries: new Map([["d", { amount: 900, period: "2026-06" }]]), expenses: new Map([["d", [{ id: "1", periodo: "2026-03", item: "Arriendo", monto_clp: 100 }, { id: "2", periodo: "2026-03", item: "TOTAL", monto_clp: 100 }, { id: "3", periodo: "2025-12", item: "Arriendo", monto_clp: 50 }]], ["s", [{ id: "4", periodo: "2026-05", item: "Ajuste", monto_clp: -10 }]]]) });
    expect(rows.filter(r => r.component === "gastos").map(r => r.amount)).toEqual([100, -10]);
    expect(rows.filter(r => r.component === "dieta")).toEqual([expect.objectContaining({ period: "2026-06", amount: 900 })]);
  });
  it("no inventa montos para ítems ausentes y admite un total sin desglose", () => {
    const rows = buildDashboardRows({ members, staff: null, salaries: new Map(), expenses: new Map([["d", [{ id: "a", periodo: "2026-02", item: "TOTAL", monto_clp: 0 }, { id: "b", periodo: "2026-03", item: "Arriendo", monto_clp: null }]]]) });
    expect(rows).toEqual([expect.objectContaining({ period: "2026-02", amount: 0, item: "Total publicado sin desglose" })]);
  });
  it("preserva personal sin monto y nómina vacía confirmada sin mezclar meses", () => {
    const staff = { diputados: { "10": { personal_apoyo_por_periodo: { "2026-01": { status: "available", rows: [{ sueldo: 20 }] }, "2026-03": { status: "available", rows: [{ sueldo: null }] }, "2026-04": { status: "empty_confirmed", rows: [] } } } }, senadores: {} } as unknown as PersonalApoyoDataset;
    const rows = buildDashboardRows({ members, staff, salaries: new Map(), expenses: new Map() });
    expect(rows.map(r => [r.period, r.amount])).toEqual([["2026-01", 20], ["2026-03", null], ["2026-04", 0]]);
  });
  it("combina cámara, parlamentario, período, componente, categoría e ítem", () => {
    expect(filterDashboardRows(data, { ...dashboardDefaults(data), chamber: "camara", member: "d", from: "2026-03", to: "2026-03", component: "gastos", category: "Oficinas", item: "Arriendo" })).toEqual([data.rows[0]]);
  });
  it("normaliza URL inválida y selecciones incompatibles", () => {
    const f = dashboardFiltersFromParams(new URLSearchParams("camara=senado&parlamentario=d&desde=2026-05&hasta=2026-03&categoria=Oficinas&item=Arriendo"), data);
    expect(f).toMatchObject({ chamber: "senado", member: "todos", from: "2026-03", to: "2026-05", category: "todas", item: "todos" });
  });
  it("acota consultas futuras al año cubierto sin truncar el gráfico silenciosamente", () => { expect(dashboardFiltersFromParams(new URLSearchParams("hasta=2099-12"), data).to).toBe("2026-12"); });
  it("los meses vacíos quedan null, un cero real se mantiene y las dietas no se suman a gastos", () => {
    const series = dashboardTimeline(data.rows, "2026-03", "2026-05");
    expect(series[0].values.personal).toMatchObject({ amount: 0, members: 1, missing: 1 });
    expect(series[1].values.gastos.amount).toBeNull();
    expect(series[2].values.gastos.amount).toBe(-10);
    expect(summarizeDashboardRows([]).dieta.amount).toBeNull();
  });
  it("exporta sólo el filtro, deja null vacío y protege fórmulas sin alterar importes", () => {
    const input = { ...data, members: data.members.map(m => ({ ...m, name: "=SUM(1)" })) };
    const csv = dashboardCsv(input, [data.rows[1], data.rows[2]]);
    expect(csv).toContain('"\'=SUM(1)"'); expect(csv).toContain(";-10;"); expect(csv).toContain('"Nómina";;;"Sin partido incorporado";"Sin importe publicado";"release"'); expect(csv).not.toContain('"Arriendo"');
  });
});
