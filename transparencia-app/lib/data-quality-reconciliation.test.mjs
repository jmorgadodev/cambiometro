import { describe, expect, it } from "vitest";
import { cpltR2ReleaseCount, reconcileSourceCounts } from "./data-quality-reconciliation.mjs";

const source = (overrides = {}) => ({
  id: "camara",
  canonicalCount: 19_025,
  historicalCount: 19_025,
  queryableCount: null,
  ...overrides,
});

describe("reconciliación de conteos de fuentes", () => {
  it("acepta el conteo CPLT sólo si el manifest, índice y partes son consistentes", () => {
    const manifest = {
      sourceId: "transparencia-activa",
      recordCount: 3,
      searchIndex: { totalRows: 3 },
      sources: [
        { sourceId: "planta", recordCount: 1, checksumSha256: "a".repeat(64) },
        { sourceId: "honorarios", recordCount: 2, checksumSha256: "b".repeat(64) },
      ],
    };
    expect(cpltR2ReleaseCount(manifest)).toBe(3);
    expect(cpltR2ReleaseCount({ ...manifest, searchIndex: { totalRows: 4 } })).toBeNull();
    expect(cpltR2ReleaseCount({ ...manifest, sources: [{ ...manifest.sources[0], checksumSha256: "invalid" }] })).toBeNull();
  });

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

  it("marca como no reconciliado el catálogo cuando declara más filas que el corte observado", () => {
    const result = reconcileSourceCounts({
      source: source({ id: "contraloria", canonicalCount: 291, historicalCount: 291, queryableCount: 291 }),
      healthEntry: { recordCount: 291 },
      catalogEntry: { recordCount: 310 },
    });

    expect(result.reconciliation).toMatchObject({
      state: "scope_mismatch",
      comparisonEligible: false,
      observedCount: 291,
      catalogCount: 310,
    });
    expect(result.reconciliation.note).toContain("310");
    expect(result.reconciliation.note).toContain("291");
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

  it("prefiere el índice R2 validado de CPLT sin afirmar cobertura total", () => {
    const result = reconcileSourceCounts({
      source: source({
        id: "transparencia-activa",
        canonicalCount: 1_203_287,
        historicalCount: 1_218_136,
        queryableCount: 1_203_287,
      }),
      healthEntry: { recordCount: 1_218_136 },
      catalogEntry: { recordCount: 0 },
      r2ReleaseCount: 1_243_761,
    });

    expect(result).toMatchObject({
      canonicalCount: 1_243_761,
      queryableCount: 1_243_761,
      reconciliation: {
        state: "release_override",
        comparisonEligible: false,
        configuredCanonicalCount: 1_203_287,
        observedCount: 1_218_136,
        catalogCount: 0,
      },
    });
    expect(result.reconciliation.note).toContain("1.243.761 registros publicados");
    expect(result.reconciliation.note).toContain("cobertura total de la fuente no está medida");
  });

  it("no infiere cobertura cuando sólo existe la configuración", () => {
    const result = reconcileSourceCounts({ source: source(), healthEntry: null, catalogEntry: null });

    expect(result.reconciliation).toMatchObject({ state: "configured_only", comparisonEligible: false });
  });
});
