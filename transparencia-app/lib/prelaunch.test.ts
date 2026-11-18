import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GLOBAL_KPIS, getGlobalKpis } from "@/lib/global-kpis";

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;

describe("Sanidad global pre-lanzamiento y rutas", () => {
  const projectRoot = join(process.cwd());

  it("G2. global-kpis.json tiene las cifras canónicas oficiales y corte", () => {
    const kpis = getGlobalKpis();
    expect(kpis.registros_canonicos).toBe(1753013);
    expect(kpis.entidades).toBe(3281);
    expect(kpis.relaciones).toBe(1897);
    expect(kpis.votaciones).toBe(12111);
    expect(kpis.gastos).toBe(690);
    expect(kpis.fuentes_oficiales).toBe(12);
    expect(kpis.fuentes_derivadas).toBe(1);
    expect(kpis.fuentes_operativas).toBe(13);
    expect(kpis.total_fuentes).toBe(13);
    expect(kpis.corte).toBe("Agosto 2026");
  });

  it("G1. Cero emojis residuales en componentes de las 4 superficies objetivo", () => {
    const filesToCheck = [
      join(projectRoot, "components", "SiteHeader.tsx"),
      join(projectRoot, "app", "page.tsx"),
      join(projectRoot, "app", "datos", "page.tsx"),
      join(projectRoot, "components", "datos", "EtlHealthDashboardClient.tsx"),
      join(projectRoot, "app", "como-funciona", "page.tsx"),
    ];

    for (const filePath of filesToCheck) {
      const content = readFileSync(filePath, "utf8");
      // Ignoramos comentarios en el test o glifos estándar no-emoji si hubiese
      const matches = content.match(EMOJI_REGEX);
      expect(matches, `Emoji detectado en ${filePath}: ${matches?.[0]}`).toBeNull();
    }
  });

  it("Sección 4. Header distingue las seis áreas activas de construcción", () => {
    const headerContent = readFileSync(join(projectRoot, "components", "SiteHeader.tsx"), "utf8");
    expect(headerContent).toContain("ACTIVE_MODULES");
    expect(headerContent).toContain("CONSTRUCTION_MODULES");
    expect(headerContent).toContain("site-nav__more");
    expect(headerContent).toContain("En construcción");
  });

  it("Sección 1. Home consume global-kpis y comunica el ámbito de cada fuente", () => {
    const homeContent = [
      readFileSync(join(projectRoot, "app", "page.tsx"), "utf8"),
      readFileSync(join(projectRoot, "components", "home", "MetricsBar.tsx"), "utf8"),
      readFileSync(join(projectRoot, "components", "home", "SourcesCatalog.tsx"), "utf8"),
    ].join("\n");
    expect(homeContent).toContain("GLOBAL_KPIS");
    expect(homeContent).toContain("getLandingSummary");
    expect(homeContent).toContain("Cada fuente tiene su propio corte");
    expect(homeContent).toContain("Los conteos corresponden a cada fuente");
  });

  it("Sección 2. /datos conserva fuentes y retira el agregado entre unidades no conciliadas", () => {
    const datosContent = readFileSync(join(projectRoot, "app", "datos", "page.tsx"), "utf8");
    expect(datosContent).not.toContain("GLOBAL_KPIS.registros_canonicos");
    expect(datosContent).toContain("getDataQualityDashboardData");
    expect(datosContent).toContain("summary.totalFuentes");
    expect(datosContent).toContain("Total entre fuentes");
    expect(datosContent).toContain("En revisión");
    expect(datosContent).toContain("Entidades y Sujetos");
  });

  it("Sección 3. /metodologia consume el resumen del corte y principios con Icono monoline", () => {
    const metodContent = readFileSync(join(projectRoot, "app", "como-funciona", "page.tsx"), "utf8");
    expect(metodContent).toContain("summary.totalRegistrosCanonicos");
    expect(metodContent).toContain('?? "No calculable"');
    expect(metodContent).not.toContain("GLOBAL_KPIS");
    expect(metodContent).toContain("Icono");
    expect(metodContent).toContain("organismo");
    expect(metodContent).toContain("etl");
    expect(metodContent).toContain("datos");
    expect(metodContent).toContain("principios");
  });
});
