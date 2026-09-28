import { describe, expect, it } from "vitest";
import { contraloriaSubsetCounts } from "../contraloria-subset.mjs";

describe("resumen de la proyección Contraloría", () => {
  it("conserva conteos cero en vez de sustituirlos por cifras de ejemplo", () => {
    expect(contraloriaSubsetCounts({
      recordCount: 0,
      entityCount: 0,
      relationCount: 0,
      records: [],
      entities: [],
      relations: [],
    })).toEqual({ recordCount: 0, entityCount: 0, relationCount: 0 });
  });

  it("deriva el conteo de los registros presentes si falta el contador del artefacto", () => {
    expect(contraloriaSubsetCounts({ records: [{ id: "a" }], entities: [], relations: [] }))
      .toEqual({ recordCount: 1, entityCount: 0, relationCount: 0 });
  });

  it("rechaza un contador declarado que no coincide con sus filas", () => {
    expect(() => contraloriaSubsetCounts({ recordCount: 275, records: [] }))
      .toThrow("CONTRALORIA_SUBSET_COUNT_MISMATCH:recordCount");
  });
});
