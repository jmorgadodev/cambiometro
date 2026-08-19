import { describe, expect, it } from "vitest";
import { mergeRecordsById } from "../scripts/etl/history.mjs";

describe("historia incremental del ETL", () => {
  it("preserva periodos anteriores y actualiza IDs repetidos de forma idempotente", () => {
    const historical = [
      { id: "old", periodo: "2026-03", monto_clp: 10 },
      { id: "same", periodo: "2026-04", monto_clp: 20 },
    ];
    const refreshed = [
      { id: "same", periodo: "2026-04", monto_clp: 25 },
      { id: "new", periodo: "2026-05", monto_clp: 30 },
    ];

    expect(mergeRecordsById(historical, refreshed)).toEqual([
      historical[0],
      refreshed[0],
      refreshed[1],
    ]);
  });
});
