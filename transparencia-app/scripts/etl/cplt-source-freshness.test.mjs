import { describe, expect, it } from "vitest";
import { compareCpltSourceValidators } from "./cplt-source-freshness.mjs";

describe("freshness de fuentes CPLT", () => {
  it("matches published municipal IDs to the legacy checker IDs without re-extracting unchanged CSVs", () => {
    const categories = ["planta", "contrata", "honorarios", "codigotrabajo"];
    const previous = categories.map(category => ({ sourceId: `cplt-personal-municipal-${category}`, sourceValidator: '"same"' }));
    const current = categories.map(category => ({ sourceId: `cplt-personal-${category}`, validator: '"same"' }));
    expect(compareCpltSourceValidators(previous, current).every(item => !item.changed)).toBe(true);
    expect(compareCpltSourceValidators(previous, [{ ...current[0], validator: '"new"' }])[0].changed).toBe(true);
  });

  it("does not treat central payroll as the municipal source", () => {
    expect(compareCpltSourceValidators([{ sourceId: "cplt-personal-central-planta", sourceValidator: '"same"' }], [{ sourceId: "cplt-personal-planta", validator: '"same"' }])[0].changed).toBe(true);
  });

  it("fails closed if legacy and municipal aliases disagree", () => {
    expect(() => compareCpltSourceValidators([
      { sourceId: "cplt-personal-planta", sourceValidator: '"old"' },
      { sourceId: "cplt-personal-municipal-planta", sourceValidator: '"new"' },
    ], [{ sourceId: "cplt-personal-planta", validator: '"new"' }])).toThrow("CPLT_FRESHNESS_SOURCE_AMBIGUOUS");
  });

  it("detecta cambios y permite omitir una corrida sin cambios", () => {
    const previous = [
      { sourceId: "cplt-personal-planta", sourceValidator: '"v1"' },
      { sourceId: "cplt-personal-contrata", sourceValidator: '"v1"' },
    ];
    expect(compareCpltSourceValidators(previous, [
      { sourceId: "cplt-personal-planta", validator: '"v1"' },
      { sourceId: "cplt-personal-contrata", validator: '"v1"' },
    ]).every((item) => !item.changed)).toBe(true);
    expect(compareCpltSourceValidators(previous, [
      { sourceId: "cplt-personal-planta", validator: '"v2"' },
      { sourceId: "cplt-personal-contrata", validator: '"v1"' },
    ]).find((item) => item.sourceId === "cplt-personal-planta")?.changed).toBe(true);
  });

  it("falla cerrado cuando una fuente todavía no tiene validator publicado", () => {
    expect(compareCpltSourceValidators([], [{ sourceId: "cplt-personal-planta", validator: '"v1"' }])[0].changed).toBe(true);
  });
});
