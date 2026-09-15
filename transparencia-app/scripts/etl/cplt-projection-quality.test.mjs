import { describe, expect, it } from "vitest";
import { projectionSummaryKey } from "./cplt-projection-quality.mjs";

describe("projectionSummaryKey", () => {
  it("resuelve el resumen declarado por el manifiesto del release", () => {
    expect(projectionSummaryKey({
      transparencySummary: { key: "projections/funcionarios-v1/versions/release/transparency-summary.json" },
    })).toBe("projections/funcionarios-v1/versions/release/transparency-summary.json");
  });

  it("rechaza claves ausentes o fuera de la ruta de proyecciones", () => {
    expect(projectionSummaryKey({ transparencySummary: { key: "../secreto.json" } })).toBeNull();
    expect(projectionSummaryKey({})).toBeNull();
  });
});
