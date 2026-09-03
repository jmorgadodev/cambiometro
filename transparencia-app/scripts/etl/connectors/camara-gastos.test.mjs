import { describe, expect, it } from "vitest";
import { assertCamaraExpenseComplete, resumableCamaraIds } from "./camara-gastos.mjs";

describe("conector de gastos operacionales de Cámara", () => {
  it("acepta sólo una nómina completamente procesada", () => {
    expect(assertCamaraExpenseComplete(155, 155)).toBe(true);
  });

  it("rechaza una extracción parcial para impedir publicar datos incompletos", () => {
    expect(() => assertCamaraExpenseComplete(154, 155)).toThrow("CAMARA_GASTOS_INCOMPLETE");
  });

  it("no considera completado un diputado si sólo quedó la marca de progreso y no su checkpoint", () => {
    expect(resumableCamaraIds(["1", "2"], ["2"])).toEqual(new Set(["2"]));
  });
});
