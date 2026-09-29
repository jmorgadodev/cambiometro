import { describe, expect, it } from "vitest";
import { normalizeRemunerationPeriod, normalizeRemunerationText, personKeyForRemuneration, relationStatus, remunerationAmountState, remunerationPeriodRange } from "../../remuneraciones-unified-contract.mjs";

describe("contrato de remuneraciones unificadas", () => {
  it("normaliza tildes, puntuación y espacios sólo para búsqueda", () => {
    expect(normalizeRemunerationText("  María  José  Raimann-Pumpín ")).toBe("maria jose raimann pumpin");
  });

  it("deriva el período de remuneración desde las filas y no desde la fecha de extracción", () => {
    expect(normalizeRemunerationPeriod("julio 2026")).toBe("2026-07");
    expect(remunerationPeriodRange(["2026-07", "2026-08", "2026-01"])).toBe("2026-01 / 2026-08");
    expect(remunerationPeriodRange(["julio 2026"])).toBe("2026-07");
    expect(remunerationPeriodRange(["sin período"])).toBeNull();
  });

  it("conserva una llave de persona no vacía para nombres faltantes", () => {
    expect(personKeyForRemuneration("", "row-17")).toBe("unknown-row-17");
  });

  it("no interpreta el placeholder 0 0 como identidad de una persona", () => {
    expect(personKeyForRemuneration("0 0", "row-may")).toBe("unknown-row-may");
    expect(personKeyForRemuneration("0 0", "row-june")).not.toBe("unknown-row-may");
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
