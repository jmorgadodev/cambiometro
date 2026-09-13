import { describe, expect, it } from "vitest";
import { compareCpltSourceValidators } from "./cplt-source-freshness.mjs";

describe("freshness de fuentes CPLT", () => {
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
