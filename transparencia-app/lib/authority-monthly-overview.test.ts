import { describe, it, expect } from "vitest";
import { authorityOverviewMonths, authorityOverviewYears } from "./authority-monthly-overview";
describe("barras mensuales del resumen", () => {
  it("mantiene 2026 por defecto y ofrece historia sólo si hay datos", () => {
    const months = [{ periodo: "2025-09", gastos: 50, personal: null }, { periodo: "2024-01", gastos: null, personal: null }];
    expect(authorityOverviewYears(months)).toEqual([2026, 2025]);
    expect(authorityOverviewMonths(months)).toEqual([]);
    expect(authorityOverviewMonths(months, 2025)).toEqual(months.slice(0, 1));
  });
  it("conserva meses e importes por separado, sin completar ausencias ni sumar componentes", () => {
    const input = [{ periodo: "2026-09", gastos: null, personal: 120 }, { periodo: "2026-08", gastos: 6834219, personal: 100 }];
    const before = JSON.stringify(input);
    expect(authorityOverviewMonths(input)).toEqual([{ periodo: "2026-08", gastos: 6834219, personal: 100 }, { periodo: "2026-09", gastos: null, personal: 120 }]);
    expect(JSON.stringify(input)).toBe(before);
  });
  it("muestra sólo meses con datos desde 2026, sin incluir un mes de dieta solamente", () => {
    expect(authorityOverviewMonths([{ periodo: "2025-12", gastos: 200, personal: 300 }, { periodo: "2026-13", gastos: 100, personal: null }, { periodo: "2026-06", gastos: null, personal: null }])).toEqual([]);
  });
  it("retiene ceros oficiales y ajustes negativos, descarta importes inválidos", () => {
    expect(authorityOverviewMonths([{ periodo: "2026-01", gastos: 0, personal: null }, { periodo: "2026-02", gastos: -200, personal: 100 }, { periodo: "2026-03", gastos: NaN, personal: Infinity }])).toEqual([{ periodo: "2026-01", gastos: 0, personal: null }, { periodo: "2026-02", gastos: -200, personal: 100 }]);
  });
});
