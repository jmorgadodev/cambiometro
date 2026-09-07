import { describe, it, expect } from "vitest";
import { getMunicipalidadData } from "@/lib/municipalidades-data";
import { getMunicipalidadesList, getMunicipalidadesStats } from "@/lib/municipalidades-list";
import { getMuniCanonicalSlug, isMuniLegacyId, getAllMuniSlugs } from "@/lib/slug-utils";
import { evaluateSenateSupport } from "@/scripts/etl/senado-assignment.mjs";

describe("Tarea C v2 & v3: Frescura, Selector Compacto y Reactividad Total por Período (CPLT)", () => {
  it("Maipú: default es el último período representativo y no un corte parcial", () => {
    const maipu = getMunicipalidadData("muni-maipu");
    expect(maipu).not.toBeNull();
    const representative = maipu?.periodos_disponibles?.find((p) => !p.es_parcial);
    expect(representative).toBeDefined();
    expect(maipu?.periodo_cplt_reciente).toBe(representative?.periodo);
    expect(maipu?.desfase_meses).toBeLessThanOrEqual(3);
    expect(maipu?.estado_frescura).toBe("al_dia");

    const newest = maipu?.periodos_disponibles?.[0];
    expect(newest).toBeDefined();
    expect(typeof newest?.count).toBe("number");
    expect(newest?.count).toBeGreaterThan(0);
  });

  it("Maipú: reactividad total de dotación y composición por estamento según período seleccionado", () => {
    const maipu = getMunicipalidadData("muni-maipu");
    const resumenPeriodo = maipu?.resumen_personal_por_periodo;
    expect(resumenPeriodo).toBeDefined();

    // El período más reciente debe conservar una suma coherente por estamento.
    const r202606 = resumenPeriodo?.["2026-06"];
    expect(r202606).toBeDefined();
    expect(r202606?.total_funcionarios).toBeGreaterThan(0);
    expect((r202606?.planta ?? 0) + (r202606?.contrata ?? 0) + (r202606?.honorarios ?? 0) + (r202606?.codigo_trabajo_salud_educacion ?? 0)).toBe(r202606?.total_funcionarios);

    // 2024-01 (período histórico)
    const r202401 = resumenPeriodo?.["2024-01"];
    expect(r202401).toBeDefined();
    expect(r202401?.total_funcionarios).toBe(468);
    expect(r202401?.planta).toBe(12);
    expect(r202401?.contrata).toBe(26);
    expect(r202401?.honorarios).toBe(429);
    expect(r202401?.codigo_trabajo_salud_educacion).toBe(1);
    expect((r202401?.planta ?? 0) + (r202401?.contrata ?? 0) + (r202401?.honorarios ?? 0) + (r202401?.codigo_trabajo_salud_educacion ?? 0)).toBe(468);

    // El release actual puede cambiar el período representativo; un corte parcial
    // siempre debe estar identificado y conservar una suma coherente.
    const r202607 = resumenPeriodo?.["2026-07"];
    expect(r202607).toBeDefined();
    expect(r202607?.total_funcionarios).toBeGreaterThan(0);
    expect((r202607?.planta ?? 0) + (r202607?.contrata ?? 0) + (r202607?.honorarios ?? 0) + (r202607?.codigo_trabajo_salud_educacion ?? 0)).toBe(r202607?.total_funcionarios);
  });

  it("El Top 5 de remuneraciones por defecto en Maipú corresponde al período representativo vigente", () => {
    const maipu = getMunicipalidadData("muni-maipu");
    expect(maipu?.top_remuneraciones).toBeDefined();
    expect(maipu?.top_remuneraciones.length).toBeGreaterThan(0);
    expect(maipu?.top_remuneraciones[0].periodo).toBe(maipu?.periodo_cplt_reciente);
    expect(maipu?.top_remuneraciones[0].periodo).not.toBe("2024-01");
  });

  it("El historial de períodos (incluyendo 2024-01) se conserva íntegro con estructura jerárquica año/mes", () => {
    const maipu = getMunicipalidadData("muni-maipu");
    expect(maipu?.periodos_disponibles).toBeDefined();
    expect(maipu?.periodos_disponibles?.length).toBeGreaterThanOrEqual(10);
    
    // Todos los períodos tienen año y mes
    for (const p of maipu?.periodos_disponibles || []) {
      expect(p.ano).toBeGreaterThanOrEqual(2024);
      expect(p.mes).toBeGreaterThanOrEqual(1);
      expect(p.mes).toBeLessThanOrEqual(12);
      expect(typeof p.count).toBe("number");
      expect(typeof p.es_parcial).toBe("boolean");
    }

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
    expect(maipu?.periodo_nomina).toBe("2026-07");
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
