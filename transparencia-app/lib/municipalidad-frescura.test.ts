import { describe, it, expect } from "vitest";
import { getMunicipalidadData } from "@/lib/municipalidades-data";
import { getMunicipalidadesList, getMunicipalidadesStats } from "@/lib/municipalidades-list";
import { getMuniCanonicalSlug, isMuniLegacyId, getAllMuniSlugs } from "@/lib/slug-utils";
import { evaluateSenateSupport } from "@/scripts/etl/senado-assignment.mjs";

describe("Tarea C v2 & v3: Frescura, Selector Compacto y Reactividad Total por Período (CPLT)", () => {
  it("Maipú: default es el último período representativo (2026-06) con >=50% de dotación, no el parcial (2026-07)", () => {
    const maipu = getMunicipalidadData("muni-maipu");
    expect(maipu).not.toBeNull();
    expect(maipu?.periodo_cplt_reciente).toBe("2026-06");
    expect(maipu?.desfase_meses).toBeLessThanOrEqual(3);
    expect(maipu?.estado_frescura).toBe("al_dia");

    const p202607 = maipu?.periodos_disponibles?.find((p) => p.periodo === "2026-07");
    expect(p202607).toBeDefined();
    expect(p202607?.es_parcial).toBe(true);
    expect(p202607?.count).toBe(239);

    const p202606 = maipu?.periodos_disponibles?.find((p) => p.periodo === "2026-06");
    expect(p202606).toBeDefined();
    expect(p202606?.es_parcial).toBe(false);
    expect(p202606?.count).toBe(4071);
  });

  it("Maipú: reactividad total de dotación y composición por estamento según período seleccionado", () => {
    const maipu = getMunicipalidadData("muni-maipu");
    const resumenPeriodo = maipu?.resumen_personal_por_periodo;
    expect(resumenPeriodo).toBeDefined();

    // 2026-06 (mes completo reciente)
    const r202606 = resumenPeriodo?.["2026-06"];
    expect(r202606).toBeDefined();
    expect(r202606?.total_funcionarios).toBe(4071);
    expect(r202606?.planta).toBe(967);
    expect(r202606?.contrata).toBe(299);
    expect(r202606?.honorarios).toBe(2803);
    expect(r202606?.codigo_trabajo_salud_educacion).toBe(2);
    expect((r202606?.planta ?? 0) + (r202606?.contrata ?? 0) + (r202606?.honorarios ?? 0) + (r202606?.codigo_trabajo_salud_educacion ?? 0)).toBe(4071);

    // 2024-01 (período histórico)
    const r202401 = resumenPeriodo?.["2024-01"];
    expect(r202401).toBeDefined();
    expect(r202401?.total_funcionarios).toBe(468);
    expect(r202401?.planta).toBe(12);
    expect(r202401?.contrata).toBe(26);
    expect(r202401?.honorarios).toBe(429);
    expect(r202401?.codigo_trabajo_salud_educacion).toBe(1);
    expect((r202401?.planta ?? 0) + (r202401?.contrata ?? 0) + (r202401?.honorarios ?? 0) + (r202401?.codigo_trabajo_salud_educacion ?? 0)).toBe(468);

    // 2026-07 (declaración parcial)
    const r202607 = resumenPeriodo?.["2026-07"];
    expect(r202607).toBeDefined();
    expect(r202607?.total_funcionarios).toBe(239);
    expect(r202607?.es_parcial).toBe(true);
    expect((r202607?.planta ?? 0) + (r202607?.contrata ?? 0) + (r202607?.honorarios ?? 0) + (r202607?.codigo_trabajo_salud_educacion ?? 0)).toBe(239);
  });

  it("El Top 5 de remuneraciones por defecto en Maipú corresponde al período 2026-06 y no muestra el finiquito de 2024-01", () => {
    const maipu = getMunicipalidadData("muni-maipu");
    expect(maipu?.top_remuneraciones).toBeDefined();
    expect(maipu?.top_remuneraciones.length).toBeGreaterThan(0);
    expect(maipu?.top_remuneraciones[0].periodo).toBe("2026-06");
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
    expect(maipu?.periodo_nomina).toBe("2026-06");
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
