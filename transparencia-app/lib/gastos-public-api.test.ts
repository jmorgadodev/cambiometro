import { describe, expect, it } from "vitest";
import { advanceExpenseOffsets, mapExpenseApiRecord, mergeExpenseSourcePages } from "./gastos-public-api";

const row = (id: string, sourceId: "gastos_camara" | "gastos_senado", date: string) => ({
  id,
  sourceId,
  title: "Traslado",
  description: "Persona",
  occurredAt: date,
  period: { periodo: date.slice(0, 7) },
  amount: { amountClp: 1200 },
  evidence: { url: "https://example.cl/source", fuente: "Fuente oficial" },
  data: { item: "Traslado", monto_clp: 1200 },
});

describe("paginación pública de gastos", () => {
  it("normaliza la respuesta de records API a una fila mostrable", () => {
    expect(mapExpenseApiRecord(row("sen-1", "gastos_senado", "2026-07-01"))).toMatchObject({
      id: "sen-1",
      sourceId: "gastos_senado",
      nombre: "Persona",
      fecha: "2026-07-01",
      periodo: "2026-07",
      item: "Traslado",
      monto_clp: 1200,
      url: "https://example.cl/source",
    });
  });

  it("mezcla fuentes por fecha sin saltar filas y avanza sólo lo consumido", () => {
    const merged = mergeExpenseSourcePages([
      [row("sen-1", "gastos_senado", "2026-07-03"), row("sen-2", "gastos_senado", "2026-07-01")].map(mapExpenseApiRecord),
      [row("cam-1", "gastos_camara", "2026-07-02"), row("cam-2", "gastos_camara", "2026-06-30")].map(mapExpenseApiRecord),
    ], 2);

    expect(merged.rows.map((item) => item.id)).toEqual(["sen-1", "cam-1"]);
    expect(merged.consumedBySource).toEqual({ gastos_camara: 1, gastos_senado: 1 });
    expect(advanceExpenseOffsets({ gastos_camara: 0, gastos_senado: 0 }, merged.consumedBySource)).toEqual({ gastos_camara: 1, gastos_senado: 1 });
  });
});
