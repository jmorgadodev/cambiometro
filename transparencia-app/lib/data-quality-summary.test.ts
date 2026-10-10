import { describe, expect, it } from "vitest";
import { buildFallbackDataQualitySummary, coverageMetric, getDataQualityConfig } from "@/lib/data-quality-summary";

describe("manifiesto unificado de calidad de datos", () => {
  const reconciliationArtifacts = {
    health: { sources: {
      chilecompra: { recordCount: 888_693 },
      contraloria: { recordCount: 291 },
    } },
    catalog: { sources: [
      { id: "chilecompra", recordCount: 74_142 },
      { id: "contraloria", recordCount: 310 },
    ] },
  };

  it("mantiene las 13 fuentes y separa el KPI global de la suma por fuente", () => {
    const summary = buildFallbackDataQualitySummary();
    expect(getDataQualityConfig()).toHaveLength(13);
    expect(summary.sourceCount).toBe(13);
    expect(summary.totalCanonicalRecords).toBeNull();
    expect(summary.totalHistoricalRecords).toBeNull();
    expect(summary.globalKpiRecords ?? null).toBeNull();
    expect(summary.metrics.published.label).toBe("No calculable");
  });

  it("no inventa porcentajes cuando no existe denominador o release consultable", () => {
    expect(coverageMetric(null, 100)).toEqual({ count: null, denominator: 100, percent: null, label: "No calculable" });
    expect(coverageMetric(10, 0).label).toBe("No calculable");
  });

  it("no confunde la generación global del catálogo con la actualización de una fuente", () => {
    const summary = buildFallbackDataQualitySummary({
      health: { generatedAt: "2026-09-29T05:00:00.000Z", sources: {
        camara: { recordCount: 19_025, status: "partial", generatedAt: "2026-09-29T05:00:00.000Z" },
      } },
      catalog: { generatedAt: "2026-09-29T05:00:00.000Z", sources: [{ id: "camara", generatedAt: "2026-09-29T05:00:00.000Z" }] },
    });
    const camara = summary.sources.find((source) => source.id === "camara");

    expect(camara).toMatchObject({ lastSuccessAt: null, lastUpdatedAt: null, lastUpdatedKind: "unknown" });
  });

  it("mantiene métricas dentro de rango para cada fuente", () => {
    const summary = buildFallbackDataQualitySummary();
    for (const source of summary.sources) {
      for (const metric of Object.values(source.metrics)) {
        if (metric.percent !== null) expect(metric.percent).toBeGreaterThanOrEqual(0);
        if (metric.percent !== null) expect(metric.percent).toBeLessThanOrEqual(100);
      }
    }
  });

  it("etiqueta la auditoría de funcionarios cuando pertenece a un snapshot anterior", () => {
    const source = buildFallbackDataQualitySummary().sources.find((item) => item.id === "transparencia-activa");
    expect(source?.qualityAudit?.status).toBe("snapshot-not-current-release");
    expect(source?.qualityAudit?.snapshotRecords).toBe(1_220_960);
    expect(source?.qualityAudit?.observations.length).toBeGreaterThan(0);
  });

  it("separa el histórico declarado del histórico realmente publicado", () => {
    const source = buildFallbackDataQualitySummary(reconciliationArtifacts).sources.find((item) => item.id === "chilecompra");
    expect(source?.historicalCount).toBe(888_693);
    expect(source?.publicHistoricalCount).toBe(74_142);
    expect(source?.publicHistoricalCount).toBeLessThan(source?.historicalCount ?? 0);
  });

  it("usa el índice público R2 reconciliado de InfoLobby", () => {
    const source = buildFallbackDataQualitySummary().sources.find((item) => item.id === "infolobby");
    expect(source?.catalogDeclaredCount).toBeUndefined();
    expect(source?.canonicalCount).toBe(71_467);
    expect(source?.publicHistoricalCount).toBe(71_467);
    expect(source?.metrics.queryable.count).toBe(71_467);
  });

  it("separa el catálogo DIPRES del release público consultable", () => {
    const source = buildFallbackDataQualitySummary().sources.find((item) => item.id === "dipres");
    expect(source?.catalogDeclaredCount).toBe(279_014);
    expect(source?.publicHistoricalCount).toBe(15_901);
    expect(source?.publicHistoricalCount).toBeLessThan(source?.catalogDeclaredCount ?? 0);
    expect((source?.catalogDeclaredCount ?? 0) - (source?.publicHistoricalCount ?? 0)).toBe(263_113);
  });

  it("deriva el corte y el total de observaciones DIPRES desde las particiones disponibles", () => {
    const source = buildFallbackDataQualitySummary({
      health: { sources: { dipres: { recordCount: 3, status: "partial" } } },
      catalog: {
        sources: [{ id: "dipres", recordCount: 85 }],
        partitions: [
          { sourceId: "dipres", period: "2021-12", recordCount: 10 },
          { sourceId: "dipres", period: "2026-06", recordCount: 20 },
          { sourceId: "dipres", period: "2026-07", recordCount: 25 },
          { sourceId: "dipres", period: "2026-08", recordCount: 30 },
        ],
      },
    }).sources.find((item) => item.id === "dipres");

    expect(source).toMatchObject({
      canonicalCount: 30,
      historicalCount: 85,
      catalogDeclaredCount: 85,
      publicHistoricalCount: 30,
      period: "2021-12 a 2026-08 · 4 cortes disponibles; serie discontinua",
      status: "parcial",
    });
    expect(source?.reconciliation.comparisonEligible).toBe(false);
    expect(source?.metrics.published.percent).toBeNull();
  });

  it("no promueve el corte DIPRES cuando el total del catálogo contradice sus particiones", () => {
    const source = buildFallbackDataQualitySummary({
      catalog: {
        sources: [{ id: "dipres", recordCount: 86 }],
        partitions: [
          { sourceId: "dipres", period: "2026-07", recordCount: 25 },
          { sourceId: "dipres", period: "2026-08", recordCount: 30 },
        ],
      },
    }).sources.find((item) => item.id === "dipres");

    expect(source?.canonicalCount).toBe(15_901);
    expect(source?.historicalCount).toBe(86);
    expect(source?.catalogDeclaredCount).toBe(86);
    expect(source?.publicHistoricalCount).toBeNull();
    expect(source?.period).toBe("Cortes DIPRES no conciliados");
    expect(source?.reconciliation.state).toBe("scope_mismatch");
    expect(source?.reconciliation.comparisonEligible).toBe(false);
    expect(source?.reconciliation.note).toContain("86");
    expect(source?.reconciliation.note).toContain("no suman ese total");
  });

  it("no anuncia conteos ni cobertura de Contraloría cuando el catálogo discrepa del snapshot", () => {
    const source = buildFallbackDataQualitySummary(reconciliationArtifacts).sources.find((item) => item.id === "contraloria");

    expect(source?.reconciliation).toMatchObject({
      state: "scope_mismatch",
      comparisonEligible: false,
      observedCount: 291,
      catalogCount: 310,
    });
    expect(source?.publicHistoricalCount).toBeNull();
    expect(source?.metrics.published.label).toBe("No calculable");
    expect(source?.metrics.queryable.label).toBe("No calculable");
  });

  it("usa el release CPLT verificado en R2 y no inventa cobertura total en el fallback", () => {
    const summary = buildFallbackDataQualitySummary({
      health: { sources: { cplt: { recordCount: 1_218_136 } } },
      catalog: { sources: [{ id: "transparencia-activa", recordCount: 0 }] },
      cpltManifest: {
        sourceId: "transparencia-activa",
        generatedAt: "2026-09-15T08:08:44.566Z",
        recordCount: 3,
        searchIndex: { totalRows: 3 },
        sources: [{ sourceId: "planta", recordCount: 3, checksumSha256: "a".repeat(64) }],
      },
    });
    const source = summary.sources.find((item) => item.id === "transparencia-activa");

    expect(source).toMatchObject({
      canonicalCount: 3,
      publicHistoricalCount: 3,
      period: "Período por confirmar",
      lastUpdatedAt: "2026-09-15T08:08:44.566Z",
      lastUpdatedKind: "release",
      reconciliation: { state: "release_override", comparisonEligible: false },
      metrics: { published: { label: "No calculable" }, queryable: { label: "No calculable" } },
    });
    expect(source?.reconciliation.note).toContain("cobertura total de la fuente no está medida");
  });
});
