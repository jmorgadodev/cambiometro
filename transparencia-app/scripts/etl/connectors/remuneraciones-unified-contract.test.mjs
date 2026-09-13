import { describe, expect, it } from "vitest";
import { normalizeRemunerationText, personKeyForRemuneration, relationStatus, remunerationAmountState } from "../../remuneraciones-unified-contract.mjs";

describe("contrato de remuneraciones unificadas", () => {
  it("normaliza tildes, puntuación y espacios sólo para búsqueda", () => {
    expect(normalizeRemunerationText("  María  José  Raimann-Pumpín ")).toBe("maria jose raimann pumpin");
  });

  it("conserva una llave de persona no vacía para nombres faltantes", () => {
    expect(personKeyForRemuneration("", "row-17")).toBe("unknown-row-17");
  });

  it("reconoce el mismo nombre cuando la fuente intercambia el orden de los apellidos", () => {
    expect(
      personKeyForRemuneration("RÍO SEBASTIÁN TORREALBA DEL", "row-april"),
    ).toBe(
      personKeyForRemuneration("SEBASTIÁN TORREALBA DEL RÍO", "row-march"),
    );
  });

  it("no confunde nombres con palabras distintas sólo por compartir un apellido", () => {
    expect(
      personKeyForRemuneration("RÍO SEBASTIÁN TORREALBA DEL", "row-a"),
    ).not.toBe(
      personKeyForRemuneration("ALEJANDRO RAMÓN RÍOS TORREALBA", "row-b"),
    );
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
