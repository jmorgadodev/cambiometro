import { describe, expect, it } from "vitest";
import { buildFallbackDataQualitySummary } from "@/lib/data-quality-summary";
import { ETL_SOURCES_DATA } from "@/lib/etl-sources-data";

describe("alcance agregado de DIPRES", () => {
  it("declara el último corte conocido sin confundirlo con el histórico acumulado", () => {
    const source = buildFallbackDataQualitySummary().sources.find((item) => item.id === "dipres");

    expect(source?.canonicalCount).toBe(15_901);
    expect(source?.catalogDeclaredCount).toBe(279_014);
    expect(source?.publicHistoricalCount).toBe(15_901);
    expect(source?.historicalCount).toBe(279_014);
    expect(source?.period).toContain("2026-08");
    expect(source?.status).toBe("parcial");
    expect(source?.coverageNote).toContain("catálogo acumula observaciones de cortes mensuales");
  });

  it("mantiene el catálogo operativo en el último conteo mensual conocido", () => {
    const source = ETL_SOURCES_DATA.find((item) => item.id === "etl_dipres_presupuestos");
    expect(source?.recordCount).toBe(15_901);
    expect(source?.canonicalCount).toBe(15_901);
    expect(source?.historicalCount).toBe(279_014);
  });
});
