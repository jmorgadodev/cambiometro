import { describe, expect, it } from "vitest";
import {
  assertCamaraExpenseComplete,
  parseCamaraExpensePanel,
  resumableCamaraIds,
  orderedCamaraExpenseMonths,
  camaraExpenseSelection,
  assertCamaraExpenseAuthority,
} from "./camara-gastos.mjs";

describe("conector de gastos operacionales de Cámara", () => {
  it("detiene la extracción si el sitio selecciona una autoridad distinta de la solicitada", () => {
    expect(() => assertCamaraExpenseAuthority("1110", "1110")).not.toThrow();
    expect(() => assertCamaraExpenseAuthority("1110", "1009")).toThrow("AUTHORITY_MISMATCH");
  });
  it("usa el año seleccionado en la fuente y verifica el alcance antes de consultar meses", () => {
    expect(camaraExpenseSelection({ year: "2026", months: ["3", "8", "9"], periods: ["2026-09", "2026-08"] })).toEqual({ year: 2026, months: ["8", "9"] });
    expect(() => camaraExpenseSelection({ year: "2025", months: ["8"], periods: ["2026-08"] })).toThrow("PERIOD_SCOPE_INVALID");
    expect(() => camaraExpenseSelection({ year: "", months: ["8"] })).toThrow("YEAR_INVALID");
    expect(() => camaraExpenseSelection({ year: "2026", months: ["8"], periods: ["2026-09"] })).toThrow("PERIOD_NOT_AVAILABLE");
  });
  it("ordena los meses de la fuente y rechaza opciones inválidas", () => {
    expect(orderedCamaraExpenseMonths(["09", "3", "8"])).toEqual(["3", "8", "9"]);
    expect(() => orderedCamaraExpenseMonths(["0", "1"])).toThrow("MONTH_OPTIONS_INVALID");
    expect(() => orderedCamaraExpenseMonths(["1", "01"])).toThrow("MONTH_OPTIONS_INVALID");
  });
  it("acepta sólo una nómina completamente procesada", () => {
    expect(assertCamaraExpenseComplete(155, 155)).toBe(true);
  });

  it("rechaza una extracción parcial para impedir publicar datos incompletos", () => {
    expect(() => assertCamaraExpenseComplete(154, 155)).toThrow("CAMARA_GASTOS_INCOMPLETE");
  });

  it("no considera completado un diputado si sólo quedó la marca de progreso y no su checkpoint", () => {
    expect(resumableCamaraIds(["1", "2"], ["2"])).toEqual(new Set(["2"]));
  });

  it("acepta el Set de progreso y el iterador de checkpoints que usa la extracción", () => {
    const progressIds = new Set(["1", "2"]);
    const checkpointIds = new Map([["2", []]]).keys();
    expect(resumableCamaraIds(progressIds, checkpointIds)).toEqual(new Set(["2"]));
  });
});

describe("panel mensual de gastos de Cámara", () => {
  it("no elimina el signo ni los decimales de un importe mal formado", () => {
    for (const amount of ["-1.000", "(1.000)", "1.000,50", "12 texto 34"]) expect(() => parseCamaraExpensePanel({ html: `<table><tr><td>Telefonía</td><td>${amount}</td></tr></table>` })).toThrow("CAMARA_GASTOS_AMOUNT_INVALID");
  });
  it("conserva el monto ausente y los nombres con entidades HTML", () => {
    expect(parseCamaraExpensePanel({ html: "<table><tr><td>TELEFON&Iacute;A &amp; DATOS</td><td>&nbsp;</td></tr><tr><td>Difusión</td><td>$ 1.234.567</td></tr></table>" })).toEqual({ filas: [{ item: "TELEFONÍA & DATOS", monto_clp: null }, { item: "Difusión", monto_clp: 1234567 }] });
  });
  it("no convierte el estado explícito de mes no publicado en gastos con monto cero", () => {
    expect(parseCamaraExpensePanel({
      html: "<table><tr><td>Telefonía</td><td>0</td></tr></table>",
      text: "Los datos de transparencia para el mes seleccionado no han sido publicados",
    })).toEqual({ nodata: true });
  });

  it("conserva montos cero cuando el panel sí corresponde a un mes publicado", () => {
    expect(parseCamaraExpensePanel({
      html: "<table><tr><td>Telefonía</td><td>0</td></tr></table>",
      text: "Gastos Operacionales Telefonía 0",
    })).toEqual({ filas: [{ item: "Telefonía", monto_clp: 0 }] });
  });
});
