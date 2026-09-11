import { describe, expect, it } from "vitest";
import { buildFallbackDataQualitySummary, coverageMetric, getDataQualityConfig } from "@/lib/data-quality-summary";

describe("manifiesto unificado de calidad de datos", () => {
  it("mantiene las 13 fuentes y separa el KPI global de la suma por fuente", () => {
    const summary = buildFallbackDataQualitySummary();
    expect(getDataQualityConfig()).toHaveLength(13);
    expect(summary.sourceCount).toBe(13);
    expect(summary.totalCanonicalRecords).toBeGreaterThan(1_400_000);
    expect(summary.globalKpiRecords ?? null).toBeNull();
  });

  it("no inventa porcentajes cuando no existe denominador o release consultable", () => {
    expect(coverageMetric(null, 100)).toEqual({ count: null, denominator: 100, percent: null, label: "No calculable" });
    expect(coverageMetric(10, 0).label).toBe("No calculable");
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
    const source = buildFallbackDataQualitySummary().sources.find((item) => item.id === "chilecompra");
    expect(source?.historicalCount).toBe(888_693);
    expect(source?.publicHistoricalCount).toBe(74_142);
    expect(source?.publicHistoricalCount).toBeLessThan(source?.historicalCount ?? 0);
  });

  it("separa el catálogo InfoLobby del índice público reconciliado", () => {
    const source = buildFallbackDataQualitySummary().sources.find((item) => item.id === "infolobby");
    expect(source?.catalogDeclaredCount).toBe(60_615);
    expect(source?.publicHistoricalCount).toBe(60_523);
    expect((source?.catalogDeclaredCount ?? 0) - (source?.publicHistoricalCount ?? 0)).toBe(92);
  });

  it("separa el catálogo DIPRES del release público consultable", () => {
    const source = buildFallbackDataQualitySummary().sources.find((item) => item.id === "dipres");
    expect(source?.catalogDeclaredCount).toBe(247_287);
    expect(source?.publicHistoricalCount).toBe(15_689);
    expect(source?.publicHistoricalCount).toBeLessThan(source?.catalogDeclaredCount ?? 0);
    expect((source?.catalogDeclaredCount ?? 0) - (source?.publicHistoricalCount ?? 0)).toBe(231_598);
  });
});
