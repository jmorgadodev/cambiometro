import { describe, expect, it } from "vitest";
import { municipalBudgetCut } from "./municipal-finance";

describe("presupuesto municipal por corte", () => {
  it("conserva cero, no mezcla años ni llama propios a ingresos totales", () => {
    expect(municipalBudgetCut([
      { code: "BPVIM", period: "2024", monto_clp: 900 },
      { code: "BPIIM", period: "2025", monto_clp: 0 },
      { code: "IADM61", period: "2024", monto_clp: 300 },
      { code: "IADM01", period: "2025", monto_clp: 800 },
    ])).toEqual({ ano: 2025, inicial_clp: 0, vigente_clp: null, gasto_personal_clp: null, ingresos_propios_clp: null });
  });
  it("no inventa un año sin período verificable", () => {
    expect(municipalBudgetCut([{ code: "BPVIM", monto_clp: 900 }])).toBeNull();
  });
});
