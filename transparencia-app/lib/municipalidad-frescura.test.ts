import { describe, it, expect } from "vitest";
import { getMunicipalidadData } from "@/lib/municipalidades-data";
import { getMunicipalidadesList, getMunicipalidadesStats } from "@/lib/municipalidades-list";
import { getMuniCanonicalSlug, isMuniLegacyId, getAllMuniSlugs } from "@/lib/slug-utils";
import { evaluateSenateSupport } from "@/scripts/etl/senado-assignment.mjs";

describe("Tarea C v2: Frescura y Cobertura de Nóminas Municipales (CPLT)", () => {
  it("Maipú posee período CPLT reciente (2026-06 / 2026-07) y estado 'al_dia' (≤90 días de desfase)", () => {
    const maipu = getMunicipalidadData("muni-maipu");
    expect(maipu).not.toBeNull();
    expect(maipu?.periodo_cplt_reciente).toMatch(/^2026-(?:0[67])$/);
    expect(maipu?.desfase_meses).toBeLessThanOrEqual(3);
    expect(maipu?.estado_frescura).toBe("al_dia");
  });

  it("El Top 5 de remuneraciones por defecto en Maipú corresponde al período reciente y no muestra el finiquito de 2024-01", () => {
    const maipu = getMunicipalidadData("muni-maipu");
    expect(maipu?.top_remuneraciones).toBeDefined();
    expect(maipu?.top_remuneraciones.length).toBeGreaterThan(0);
    expect(maipu?.top_remuneraciones[0].periodo).toMatch(/^2026-(?:0[67])$/);
    expect(maipu?.top_remuneraciones[0].periodo).not.toBe("2024-01");
  });

  it("El historial de períodos (incluyendo 2024-01) se conserva íntegro y navegable en Maipú", () => {
    const maipu = getMunicipalidadData("muni-maipu");
    expect(maipu?.periodos_disponibles).toBeDefined();
    expect(maipu?.periodos_disponibles?.length).toBeGreaterThanOrEqual(10);
    const has202401 = maipu?.periodos_disponibles?.some((p) => p.periodo === "2024-01");
    expect(has202401).toBe(true);

    const top202401 = maipu?.top_remuneraciones_por_periodo?.["2024-01"];
    expect(top202401).toBeDefined();
    expect(top202401?.[0].nombre).toContain("Nicolas");
    expect(top202401?.[0].remuneracion_bruta).toBe(33161679);
  });

  it("El catálogo liviano de municipalidades incluye campos de frescura y cálculo de compliance", () => {
    const list = getMunicipalidadesList();
    expect(list.length).toBe(346);
    const maipu = list.find((m) => m.id === "muni-maipu");
    expect(maipu?.periodo_nomina).toMatch(/^2026-(?:0[67])$/);
    expect(maipu?.estado_frescura).toBe("al_dia");

    const stats = getMunicipalidadesStats();
    expect(stats.totalComunas).toBe(346);
    expect(typeof stats.alDiaCount).toBe("number");
    expect(typeof stats.desfasadoCount).toBe("number");
    expect(typeof stats.sinDatosCount).toBe("number");
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
