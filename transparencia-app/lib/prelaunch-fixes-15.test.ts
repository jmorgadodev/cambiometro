import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { listPublishedSourceManifests } from "@/lib/published-sources";
import { ETL_SOURCES_DATA } from "@/lib/etl-sources-data";

describe("Tarea 15 - 5 Fixes Críticos Pre-Launch", () => {
  const projectRoot = join(process.cwd());

  it("Fix 1: ChileCompra expone canónicos 74.142 e histórico 888.693 en fuentes", async () => {
    const published = await listPublishedSourceManifests();
    const ccPublished = published.find((s) => s.id === "chilecompra");
    expect(ccPublished).toBeDefined();
    expect(ccPublished?.canonicalCount).toBe(74142);
    expect(ccPublished?.historicalCount).toBe(888693);

    const ccEtl = ETL_SOURCES_DATA.find((s) => s.id === "etl_chilecompra_ocds");
    expect(ccEtl).toBeDefined();
    expect(ccEtl?.canonicalCount).toBe(74142);
    expect(ccEtl?.historicalCount).toBe(888693);

    // Verificar que los componentes contienen el desglose dual
    const fuentesContent = readFileSync(join(projectRoot, "app", "fuentes", "page.tsx"), "utf8");
    expect(fuentesContent).toContain("Canónicos:");
    expect(fuentesContent).toContain("Histórico:");
    expect(fuentesContent).toContain("Diferencia por deduplicación y cobertura declarada");

    const datosContent = readFileSync(join(projectRoot, "components", "datos", "EtlHealthDashboardClient.tsx"), "utf8");
    expect(datosContent).toContain("Canónicos:");
    expect(datosContent).toContain("Histórico:");
    expect(datosContent).toContain("Diferencia por deduplicación y cobertura declarada");
  });

  it("Fix 2: Home y /datos muestran el catálogo de fuentes con coherencia numérica", () => {
    const homeContent = readFileSync(join(projectRoot, "app", "page.tsx"), "utf8");
    expect(homeContent).toContain("operationalSources.length");
    expect(homeContent).toContain("12 fuentes oficiales");
    expect(homeContent).toContain('href="/fuentes"');

    const datosContent = readFileSync(join(projectRoot, "app", "datos", "page.tsx"), "utf8");
    expect(datosContent).toContain("fuentes oficiales +");
    expect(datosContent).toContain("derivada");
  });

  it("Fix 3: /rankings implementa estado honesto con banner y sin ceros pelados", () => {
    const rankingsContent = readFileSync(join(projectRoot, "app", "rankings", "page.tsx"), "utf8");
    expect(rankingsContent).toContain("Rankings en actualización: SERVEL 2025 cargado (23.894 registros). Materialización pendiente.");
    expect(rankingsContent).toContain("Última sinc: 21-08-2026");
    expect(rankingsContent).toContain("https://www.servel.cl/resultados-electorales/");
    expect(rankingsContent).toContain("23.894 (en proceso)");
    expect(rankingsContent).toContain("En actualización");
  });

  it("Fix 4: No existen URLs inventadas de municipalidadde en el código de la app", () => {
    const muniDetailContent = readFileSync(join(projectRoot, "app", "municipalidades", "[id]", "page.tsx"), "utf8");
    expect(muniDetailContent).not.toContain("municipalidadde");
    expect(muniDetailContent).not.toContain("?org=");
    expect(muniDetailContent).toContain("{webOficial &&");
    expect(muniDetailContent).toContain("{transparenciaActivaUrl &&");

    const qualityContent = readFileSync(join(projectRoot, "lib", "funcionarios-quality.ts"), "utf8");
    expect(qualityContent).not.toContain("?org=");
  });
});
