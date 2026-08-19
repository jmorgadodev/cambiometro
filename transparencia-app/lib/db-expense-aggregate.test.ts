import { describe, expect, it } from "vitest";
import { aggregatePoliticoExpenseCache } from "./db";

describe("agregación del ranking desde la caché usada por las fichas", () => {
  it("usa el último mes para diputados y el acumulado para senadores", () => {
    const result = aggregatePoliticoExpenseCache([
      {
        politico_id: "dip-001",
        gastos_json: JSON.stringify([
          { periodo: "2026-04", monto_clp: 100 },
          { periodo: "2026-05", monto_clp: 200 },
          { periodo: "2026-05", monto_clp: 50 },
        ]),
      },
      {
        politico_id: "sen-001",
        gastos_json: JSON.stringify([
          { periodo: "2026-04", monto_clp: 100 },
          { periodo: "2026-05", monto_clp: 200 },
        ]),
      },
    ]);

    expect(result["dip-001"]).toMatchObject({
      total_mensual: 250,
      meses_registrados: 2,
      ultimo_mes: "2026-05",
    });
    expect(result["sen-001"]).toMatchObject({
      total_mensual: 300,
      meses_registrados: 2,
      ultimo_mes: "2026-05",
    });
  });
});
