import { describe, expect, it } from "vitest";
import { reconcileSenateExpenseHistory } from "../scripts/etl/senado-expense-reconciliation.mjs";

describe("reconciliación de gastos mensuales del Senado", () => {
  it("preserva el histórico publicado en el candidato completo con snapshot local vacío", () => {
    const historic = { id: "historic", periodo: "2012-01", monto_clp: null };
    const publishedRecords = [historic, { id: "jul-1", periodo: "2026-07", monto_clp: 10 }];
    const refreshed = [{ id: "jul-1", periodo: "2026-07", monto_clp: 20 }];
    expect(reconcileSenateExpenseHistory([], refreshed, { publishedRecords })).toEqual([historic, ...refreshed]);
    expect(publishedRecords[1].monto_clp).toBe(10);
  });
  it("compara contra el release publicado aunque el snapshot local esté vacío", () => {
    const publishedRecords = [
      { id: "jul-1", periodo: "2026-07" },
      { id: "jul-2", periodo: "2026-07" },
    ];
    expect(() => reconcileSenateExpenseHistory([], [publishedRecords[0]], { publishedRecords }))
      .toThrow("ETL_CANDIDATE_COUNT_REGRESSION");
    expect(reconcileSenateExpenseHistory([], publishedRecords, { publishedRecords })).toEqual(publishedRecords);
  });
  it("detiene una reducción mensual aunque otro mes crezca y conserva el original", () => {
    const previous = [
      { id: "jun-1", periodo: "2026-06" },
      { id: "jun-2", periodo: "2026-06" },
      { id: "jul-1", periodo: "2026-07" },
    ];
    const original = structuredClone(previous);
    const refreshed = [
      { id: "jun-1", periodo: "2026-06" },
      { id: "jul-1", periodo: "2026-07" },
      { id: "jul-2", periodo: "2026-07" },
      { id: "jul-3", periodo: "2026-07" },
    ];
    expect(() => reconcileSenateExpenseHistory(previous, refreshed)).toThrow("ETL_CANDIDATE_COUNT_REGRESSION");
    expect(previous).toEqual(original);
  });

  it("rechaza un corte vacío y los IDs repetidos antes de fusionar", () => {
    const row = { id: "jul-1", periodo: "2026-07" };
    expect(() => reconcileSenateExpenseHistory([row], [])).toThrow("ETL_CANDIDATE_EMPTY");
    expect(() => reconcileSenateExpenseHistory([row], [row, row])).toThrow("ETL_CANDIDATE_DUPLICATE_ID");
  });

  it("reemplaza sólo los meses 2026 consultados y conserva el historial fuera de esos meses", () => {
    const previous = [
      { id: "2025-12-old", periodo: "2025-12", monto_clp: 10 },
      { id: "2026-06-kept", periodo: "2026-06", monto_clp: 20 },
      { id: "2026-07-revised", periodo: "2026-07", monto_clp: 30 },
      { id: "2026-07-removed", periodo: "2026-07", monto_clp: 40 },
      { id: "2026-08-unfetched", periodo: "2026-08", monto_clp: 50 },
    ];
    const refreshed = [
      { id: "2026-07-revised", periodo: "2026-07", monto_clp: 35 },
      { id: "2026-07-new", periodo: "2026-07", monto_clp: 60 },
    ];

    expect(reconcileSenateExpenseHistory(previous, refreshed)).toEqual([
      previous[0],
      previous[1],
      previous[4],
      refreshed[0],
      refreshed[1],
    ]);
  });

  it("rechaza filas nuevas sin período para no reemplazar un corte con datos sin alcance", () => {
    expect(() => reconcileSenateExpenseHistory([], [
      { id: "gasto-sin-periodo", monto_clp: 100 },
    ])).toThrow("SENADO_EXPENSE_PERIOD_REQUIRED");
  });

  it("rechaza filas anteriores a 2026 aunque lleguen por una ruta inesperada", () => {
    expect(() => reconcileSenateExpenseHistory([], [
      { id: "gasto-2025", periodo: "2025-12", monto_clp: 100 },
    ])).toThrow("SENADO_EXPENSE_PERIOD_BEFORE_2026");
  });
});
