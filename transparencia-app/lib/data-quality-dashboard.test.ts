import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDataQualityDashboardData } from "@/lib/data-quality-dashboard";
import { getMuniCanonicalSlug, isMuniLegacyId, getAllMuniSlugs } from "@/lib/slug-utils";
import { evaluateSenateSupport } from "@/scripts/etl/senado-assignment.mjs";

describe("Tarea D: Dashboard Público de Calidad de Datos (/datos/calidad)", () => {
  const projectRoot = join(process.cwd());

  it("Retorna las 13 fuentes (12 oficiales + 1 derivada) con metadata completa y sin números inventados", async () => {
    const { sources, summary } = await getDataQualityDashboardData();

    expect(sources).toBeDefined();
    expect(sources.length).toBe(13);

    expect(summary.totalFuentes).toBe(13);
    expect(summary.fuentesOficiales).toBe(12);
    expect(summary.fuentesDerivadas).toBe(1);
    expect(summary.fuentesAlDia).toBeGreaterThanOrEqual(12);
    expect(summary.guardsCriticos).toBe(0);
    expect(summary.coberturaMunicipalAlDia).toBeGreaterThanOrEqual(2);
    expect(summary.coberturaMunicipalTotal).toBe(346);

    const expectedSourceIds = [
      "transparencia-activa",
      "chilecompra",
      "ley-19862",
      "dipres",
      "sinim",
      "ine-censo-2024",
      "infolobby",
      "infoprobidad",
      "contraloria",
      "camara",
      "senado",
      "servel",
      "personal-apoyo",
    ];

    for (const id of expectedSourceIds) {
      const source = sources.find((s) => s.id === id);
      expect(source).toBeDefined();
      expect(source?.name.length).toBeGreaterThan(0);
      expect(source?.organization.length).toBeGreaterThan(0);
      expect(source?.officialUrl).toMatch(/^https?:\/\//);
      expect(source?.canonicalCount).toBeGreaterThan(0);
      expect(source?.historicalCount).toBeGreaterThanOrEqual(source?.canonicalCount ?? 0);
      expect(source?.periodoReciente.length).toBeGreaterThan(0);
      expect(source?.lastSyncFormatted.length).toBeGreaterThan(0);
    }

    // Verificar fuente derivada
    const derived = sources.find((s) => s.id === "personal-apoyo");
    expect(derived?.isDerived).toBe(true);
  });

  it("Página /datos/calidad existe y contiene enlaces de entrada y salida", () => {
    const calidadPageContent = readFileSync(join(projectRoot, "app", "datos", "calidad", "page.tsx"), "utf8");
    expect(calidadPageContent).toContain("Dashboard de Calidad de Datos");
    expect(calidadPageContent).toContain("Guards V1-V7");
    expect(calidadPageContent).toContain('href="/fuentes"');
    expect(calidadPageContent).toContain('href="/datos"');

    const datosPageContent = readFileSync(join(projectRoot, "app", "datos", "page.tsx"), "utf8");
    expect(datosPageContent).toContain('href="/datos/calidad"');
    expect(datosPageContent).toContain("Ver calidad de datos →");

    const fuentesPageContent = readFileSync(join(projectRoot, "app", "fuentes", "page.tsx"), "utf8");
    expect(fuentesPageContent).toContain('href="/datos/calidad"');
    expect(fuentesPageContent).toContain("Dashboard de calidad →");
  });

  it("Invariante de integridad: Vanessa Kaiser mantiene evaluación ALTA y fórmula de exceso +33,7%", () => {
    const evalKaiser = evaluateSenateSupport({
      total_clp: 15_250_000,
      period: "2026-07",
      base_mensual_clp: 11_406_149,
      verified_transfers: [],
    });
    expect(evalKaiser.status).toBe("ALTA");
    expect(evalKaiser.excess_clp).toBe(3843851);
    const pct = ((15250000 - 11406149) / 11406149) * 100;
    const formattedPct = `+${pct.toFixed(1).replace(".", ",")}%`;
    expect(formattedPct).toBe("+33,7%");
  });

  it("Invariante SEO: Slugs semánticos y detección de URLs legadas muni-* intactos", () => {
    expect(getMuniCanonicalSlug("muni-maipu")).toBe("maipu");
    expect(isMuniLegacyId("muni-maipu")).toBe(true);
    expect(getMuniCanonicalSlug("maipu")).toBe("maipu");
    const allSlugs = getAllMuniSlugs();
    expect(allSlugs.length).toBe(346);
    expect(allSlugs.some((s) => s.slug === "maipu")).toBe(true);
  });
});
