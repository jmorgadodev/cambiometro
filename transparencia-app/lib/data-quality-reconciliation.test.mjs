import { describe, expect, it } from "vitest";
import { reconcileSourceCounts } from "./data-quality-reconciliation.mjs";

const source = (overrides = {}) => ({
  id: "camara",
  canonicalCount: 19_025,
  historicalCount: 19_025,
  queryableCount: null,
  ...overrides,
});

describe("reconciliación de conteos de fuentes", () => {
  it("usa el snapshot observado cuando coincide con la referencia", () => {
    const result = reconcileSourceCounts({
      source: source(),
      healthEntry: { recordCount: 19_025 },
      catalogEntry: { recordCount: 19_025 },
    });

    expect(result).toMatchObject({
      canonicalCount: 19_025,
      historicalCount: 19_025,
      reconciliation: { state: "aligned", comparisonEligible: true, observedCount: 19_025, catalogCount: 19_025 },
    });
  });

  it("no convierte una diferencia de alcance en cobertura", () => {
    const result = reconcileSourceCounts({
      source: source(),
      healthEntry: { recordCount: 58_751, components: { asistencia: 54_538, votaciones: 4_058, gastos: 16_275 } },
      catalogEntry: { recordCount: 58_751 },
    });

    expect(result.canonicalCount).toBe(58_751);
    expect(result.reconciliation.state).toBe("scope_mismatch");
    expect(result.reconciliation.comparisonEligible).toBe(false);
    expect(result.reconciliation.components).toMatchObject({ asistencia: 54_538, votaciones: 4_058 });
  });

  it("acepta el release explícito de transferencias como denominador vigente", () => {
    const result = reconcileSourceCounts({
      source: source({ id: "ley-19862", canonicalCount: 59_361, historicalCount: 59_361 }),
      healthEntry: { recordCount: 62_443 },
      catalogEntry: { recordCount: 62_443 },
      transferRows: 62_172,
    });

    expect(result).toMatchObject({
      canonicalCount: 62_172,
      historicalCount: 62_172,
      queryableCount: 62_172,
      reconciliation: { state: "release_override", comparisonEligible: true },
    });
  });

  it("no infiere cobertura cuando sólo existe la configuración", () => {
    const result = reconcileSourceCounts({ source: source(), healthEntry: null, catalogEntry: null });

    expect(result.reconciliation).toMatchObject({ state: "configured_only", comparisonEligible: false });
  });
});
