import { describe, expect, it } from "vitest";
import { auditCpltProjection } from "../scripts/etl/cplt-projection-quality.mjs";

function fixture(overrides: Record<string, unknown> = {}) {
  return {
    manifest: {
      recordCount: 3,
      coverage: [
        { communeId: "muni-a", status: "available", recordCount: 2 },
        { communeId: "muni-b", status: "unavailable", recordCount: 1 },
      ],
    },
    index: {
      totalRows: 3,
      pages: [{ page: 1, count: 2 }, { page: 2, count: 1 }],
      filters: { "periodo:2026-08": { count: 2 }, "periodo:2026-09": { count: 1 } },
      quality: { recordsWithIssues: 1, correctedRows: 0, observedRows: 1, byIssue: { remuneracion_liquida_no_informada: 1 } },
    },
    summary: { periods: [{ period: "2026-08" }, { period: "2026-09" }] },
    ...overrides,
  };
}

describe("auditoría acotada de proyección CPLT", () => {
  it("permite promoción cuando manifiesto, páginas e índices de período coinciden", () => {
    const result = auditCpltProjection(fixture());
    expect(result).toMatchObject({
      status: "ready",
      promotionAllowed: true,
      manifestRows: 3,
      pageRows: 3,
      invalidPeriodRows: 0,
      coverage: { declared: 2, available: 1, unavailable: 1, recordRows: 3, duplicateIds: 0 },
    });
  });

  it("bloquea una cobertura territorial que no coincide con el total del manifiesto", () => {
    const result = auditCpltProjection(fixture({
      manifest: {
        recordCount: 3,
        coverage: [{ communeId: "muni-a", status: "available", recordCount: 2 }],
      },
    }));
    expect(result.status).toBe("blocked");
    expect(result.structuralIssues).toContain("coverage_record_count_sum_mismatch");
  });

  it("bloquea períodos indexados fuera del release declarado aunque el total cuadre", () => {
    const result = auditCpltProjection(fixture({
      index: {
        totalRows: 3,
        pages: [{ page: 1, count: 3 }],
        filters: { "periodo:2026-08": { count: 2 }, "periodo:3538-04": { count: 1 } },
      },
    }));
    expect(result.status).toBe("blocked");
    expect(result.promotionAllowed).toBe(false);
    expect(result.invalidPeriodRows).toBe(1);
    expect(result.structuralIssues).toContain("period_filters_outside_declared_release");
  });

  it("bloquea filas marcadas con período inválido por el generador", () => {
    const result = auditCpltProjection(fixture({
      index: {
        totalRows: 3,
        pages: [{ page: 1, count: 3 }],
        filters: { "periodo:2026-08": { count: 2 }, "periodo:2026-09": { count: 1 } },
        quality: { invalidPeriodRows: 1 },
      },
    }));
    expect(result.status).toBe("blocked");
    expect(result.quality).toMatchObject({ invalidPeriodRows: 1 });
    expect(result.structuralIssues).toContain("rows_with_invalid_period");
  });

  it("bloquea filtros con año futuro o formato imposible aunque aparezcan declarados", () => {
    const result = auditCpltProjection(fixture({
      manifest: { recordCount: 3, generatedAt: "2026-09-14T03:51:42.634Z", coverage: [
        { communeId: "muni-a", status: "available", recordCount: 2 },
        { communeId: "muni-b", status: "unavailable", recordCount: 1 },
      ] },
      index: {
        totalRows: 3,
        pages: [{ page: 1, count: 3 }],
        filters: { "periodo:2026-08": { count: 2 }, "periodo:3538-04": { count: 1 } },
      },
      summary: { generatedAt: "2026-09-14T03:51:42.634Z", periods: [{ period: "2026-08" }, { period: "3538-04" }] },
    }));
    expect(result.status).toBe("blocked");
    expect(result.malformedPeriodFilterCount).toBe(1);
    expect(result.malformedPeriodRows).toBe(1);
    expect(result.structuralIssues).toContain("period_filters_with_invalid_format");
  });

  it("bloquea períodos posteriores al corte aunque tengan formato válido", () => {
    const result = auditCpltProjection(fixture({
      manifest: {
        recordCount: 3,
        generatedAt: "2026-09-14T03:51:42.634Z",
        coverage: [
          { communeId: "muni-a", status: "available", recordCount: 2 },
          { communeId: "muni-b", status: "unavailable", recordCount: 1 },
        ],
      },
      index: {
        totalRows: 3,
        pages: [{ page: 1, count: 3 }],
        filters: { "periodo:2026-08": { count: 2 }, "periodo:2026-12": { count: 1 } },
      },
      summary: { generatedAt: "2026-09-14T03:51:42.634Z", periods: [{ period: "2026-08" }, { period: "2026-12" }] },
    }));
    expect(result.status).toBe("blocked");
    expect(result.malformedPeriodFilterCount).toBe(1);
    expect(result.malformedPeriodRows).toBe(1);
    expect(result.structuralIssues).toContain("period_filters_with_invalid_format");
  });

  it("bloquea una discrepancia entre el total declarado y las páginas físicas", () => {
    const result = auditCpltProjection(fixture({ manifest: { recordCount: 4 } }));
    expect(result.status).toBe("blocked");
    expect(result.structuralIssues).toContain("manifest_index_count_mismatch");
    expect(result.pageRows).toBe(3);
    expect(result.structuralIssues).not.toContain("page_count_sum_mismatch");
  });
});
