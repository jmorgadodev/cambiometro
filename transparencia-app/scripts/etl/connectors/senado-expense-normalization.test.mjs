import { describe, expect, it } from "vitest";
import { normalizeSenateExpense } from "./senado.mjs";

const sourceUrl = "https://www.senado.cl/transparencia/gastos-operacionales-senadores";

describe("normalizeSenateExpense", () => {
  it("preserves a negative amount published by the official source", () => {
    const item = {
      id: 1_096_427,
      attributes: {
        ano: 2012,
        mes: 4,
        gastos_operacionales: "MATERIALES DE OFICINA SENADORES",
        unidad_ejecutora: 15,
        monto: -171_017,
        nombre: "Soledad",
        appaterno: "Alvear Valenzuela",
        apmaterno: null,
      },
    };

    const normalized = normalizeSenateExpense(item, { sourceUrl });

    expect(normalized.monto_clp).toBe(-171_017);
    expect(normalized.monto_original).toEqual({ amount: "-171017", currency: "CLP", unit: "pesos" });
    expect(normalized.availability).toBe("reported");
  });

  it("continues to reject non-integer amounts", () => {
    const item = {
      id: 1,
      attributes: {
        ano: 2012,
        mes: 4,
        gastos_operacionales: "MATERIALES DE OFICINA SENADORES",
        unidad_ejecutora: 15,
        monto: 1.5,
        nombre: "Soledad",
        appaterno: "Alvear Valenzuela",
      },
    };

    expect(() => normalizeSenateExpense(item, { sourceUrl })).toThrow("SENADO_INVALID_AMOUNT");
  });

  it("keeps a published expense when the source omits the executor identifier without linking by name", () => {
    const item = {
      id: 1_104_988,
      attributes: {
        ano: 2014,
        mes: 5,
        gastos_operacionales: "OFICINAS PARLAMENTARIAS",
        unidad_ejecutora: null,
        monto: 1_007_734,
        nombre: "Manuel Antonio",
        appaterno: "Matta Aragay",
        apmaterno: null,
      },
    };

    const normalized = normalizeSenateExpense(item, { sourceUrl });

    expect(normalized.person.name).toBe("Manuel Antonio Matta Aragay");
    expect(normalized.person.entity_id).toBeNull();
    expect(normalized.person.official_id).toBeNull();
    expect(normalized.subject_entity_ids).toEqual([]);
  });
});
