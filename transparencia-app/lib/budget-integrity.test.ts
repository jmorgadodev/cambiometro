import { describe, expect, it } from "vitest";

import { evaluateBudgetSourceAnomaly } from "./budget-integrity";

describe("anomalías presupuestarias oficiales V7", () => {
  it("acepta el límite exacto y marca solo ejecución sobre presupuesto vigente", () => {
    expect(evaluateBudgetSourceAnomaly({ ejecutado: 100, vigente: 100 }).status).toBe("OK");
    expect(evaluateBudgetSourceAnomaly({ ejecutado: 101, vigente: 100 })).toEqual({
      status: "ALTA",
      validation: "V7",
      source_anomaly: true,
      difference: 1,
    });
  });

  it("no convierte ausencia oficial en cero", () => {
    expect(evaluateBudgetSourceAnomaly({ ejecutado: null, vigente: null }).status).toBe("FUENTE_NO_DISPONIBLE");
  });
});
