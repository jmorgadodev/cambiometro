import { describe, expect, it } from "vitest";
import { normalizeRemunerationText, personKeyForRemuneration, relationStatus, remunerationAmountState } from "../../remuneraciones-unified-contract.mjs";

describe("contrato de remuneraciones unificadas", () => {
  it("normaliza tildes, puntuación y espacios sólo para búsqueda", () => {
    expect(normalizeRemunerationText("  María  José  Raimann-Pumpín ")).toBe("maria jose raimann pumpin");
  });

  it("conserva una llave de persona no vacía para nombres faltantes", () => {
    expect(personKeyForRemuneration("", "row-17")).toBe("unknown-row-17");
  });

  it("no declara una relación confirmada sólo porque hay dos fuentes", () => {
    expect(relationStatus(["camara", "senado"])).toBe("possible");
    expect(relationStatus(["camara", "camara"])).toBe("single_source");
  });

  it("distingue monto no publicado de monto cero", () => {
    expect(remunerationAmountState(null)).toBe("monto_no_publicado");
    expect(remunerationAmountState(0)).toBe("publicado");
  });
});
