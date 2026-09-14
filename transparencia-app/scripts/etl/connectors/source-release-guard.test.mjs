import { describe, expect, it } from "vitest";
import { validateSourceRelease } from "../source-release-guard.mjs";

const rows = (count) => Array.from({ length: count }, (_, index) => ({ id: `row-${index + 1}` }));

describe("guarda de release por fuente", () => {
  it("rechaza un lote completo que cae anormalmente y conserva el anterior por fuera del guard", () => {
    expect(() => validateSourceRelease({ sourceId: "camara", records: rows(4), previousRecords: rows(10), minimumCount: 1 })).toThrow("SOURCE_RELEASE_UNEXPECTED_DROP");
  });

  it("rechaza un lote vacío aunque la fuente histórica use ventanas", () => {
    expect(() => validateSourceRelease({ sourceId: "infolobby", records: [], previousRecords: rows(10), minimumCount: 0, preserveHistory: true })).toThrow("SOURCE_RELEASE_EMPTY_REPLACES_PREVIOUS");
  });

  it("permite una ventana menor cuando contiene filas válidas y no mezcla IDs", () => {
    expect(validateSourceRelease({ sourceId: "infolobby", records: rows(2), previousRecords: rows(10), minimumCount: 0, preserveHistory: true })).toMatchObject({ recordCount: 2, previousCount: 10, status: "valid" });
    expect(() => validateSourceRelease({ sourceId: "senado", records: [{ id: "same" }, { id: "same" }], previousRecords: [] })).toThrow("SOURCE_RELEASE_DUPLICATE_ID");
  });
});
