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
    expect(kpis.fuentes_operativas).toBe(11);
    expect(kpis.total_fuentes).toBe(11);
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

  it("Sección 4. SiteHeader implementa el nuevo orden narrativo por clústeres", () => {
    const headerContent = readFileSync(join(projectRoot, "components", "SiteHeader.tsx"), "utf8");
    
    // Validar orden de clústeres
    expect(headerContent).toContain("Análisis Parlamentario");
    expect(headerContent).toContain("Partidos");
    expect(headerContent).toContain("Directorio de Personas");
    expect(headerContent).toContain("Servicios públicos");
    expect(headerContent).toContain("Municipalidades");
    expect(headerContent).toContain("Transferencias");
    expect(headerContent).toContain("Cruces");
    expect(headerContent).toContain("Movimientos");
    expect(headerContent).toContain("Datos");
    expect(headerContent).toContain("Metodología");

    // Validar que Servicios públicos está antes que Municipalidades
    const servIdx = headerContent.indexOf("Servicios públicos");
    const munIdx = headerContent.indexOf("Municipalidades");
    expect(servIdx).toBeLessThan(munIdx);

    // Validar que Movimientos está antes que Datos
    const movIdx = headerContent.indexOf("Movimientos");
    const datIdx = headerContent.indexOf("Datos");
    expect(movIdx).toBeLessThan(datIdx);

    // Validar separadores por clúster
    expect(headerContent).toContain("site-nav__separator");
  });

  it("Sección 1. Home consume global-kpis y contiene tooltips de ámbito", () => {
    const homeContent = readFileSync(join(projectRoot, "app", "page.tsx"), "utf8");
    expect(homeContent).toContain("GLOBAL_KPIS");
    expect(homeContent).toContain("KPI_SCOPES");
    expect(homeContent).toContain("title={item.tooltip}");
    expect(homeContent).toContain("operationalSources");
  });

  it("Sección 2. /datos muestra 11 / 11 fuentes y registros canónicos", () => {
    const datosContent = readFileSync(join(projectRoot, "app", "datos", "page.tsx"), "utf8");
    expect(datosContent).toContain("GLOBAL_KPIS.registros_canonicos");
    expect(datosContent).toContain("GLOBAL_KPIS.fuentes_operativas");
    expect(datosContent).toContain("GLOBAL_KPIS.total_fuentes");
    expect(datosContent).toContain("Registros Canónicos");
    expect(datosContent).toContain("Entidades y Sujetos");
  });

  it("Sección 3. /metodologia consume global-kpis y principios con Icono monoline", () => {
    const metodContent = readFileSync(join(projectRoot, "app", "como-funciona", "page.tsx"), "utf8");
    expect(metodContent).toContain("GLOBAL_KPIS.registros_canonicos");
    expect(metodContent).toContain("Icono");
    expect(metodContent).toContain("organismo");
    expect(metodContent).toContain("etl");
    expect(metodContent).toContain("datos");
    expect(metodContent).toContain("principios");
  });
});
