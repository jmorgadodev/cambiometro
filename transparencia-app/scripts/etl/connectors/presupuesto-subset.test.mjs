import { describe, expect, it } from "vitest";
import { presupuestoSubsetCount } from "../presupuesto-subset.mjs";

describe("conteo del subset DIPRES", () => {
  it("conserva cero y no lo reemplaza por un total de ejemplo", () => {
    expect(presupuestoSubsetCount({ count: 0, programs: [] })).toBe(0);
  });

  it("deriva el total del universo de filas si el manifiesto omite count", () => {
    expect(presupuestoSubsetCount({ programs: [{ programId: "a" }, { programId: "b" }] }))
      .toBe(2);
  });

  it("rechaza un count declarado que no coincide con las filas", () => {
    expect(() => presupuestoSubsetCount({ count: 320, programs: Array.from({ length: 476 }) }))
      .toThrow("PRESUPUESTO_SUBSET_COUNT_MISMATCH");
  });
});
