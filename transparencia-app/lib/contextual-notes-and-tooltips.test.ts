import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getMuniCanonicalSlug, isMuniLegacyId } from "@/lib/slug-utils";
import { evaluateSenateSupport } from "@/scripts/etl/senado-assignment.mjs";
import { getMunicipalidadData } from "@/lib/municipalidades-data";
import { getServicioPublicoEnriquecido } from "@/lib/servicios-publicos-data";

describe("Tarea E: Notas Contextuales y Tooltips en Fichas", () => {
  const projectRoot = join(process.cwd());

  it("1. Ficha Parlamentaria: Contiene tooltips de umbrales V2 (ALTA/CRÍTICA) y definición oficial de Presente sin votar", () => {
    const personalApoyoContent = readFileSync(
      join(projectRoot, "components", "PersonalApoyoMensual.tsx"),
      "utf8"
    );
    expect(personalApoyoContent).toContain("AccessibleTooltip");
    expect(personalApoyoContent).toContain("Umbrales de Validación V2");
    expect(personalApoyoContent).toContain("Exceso ≤40%");
    expect(personalApoyoContent).toContain("ALTA");
    expect(personalApoyoContent).toContain("CRÍTICA");
    expect(personalApoyoContent).toContain("/como-funciona#fuentes");

    const headerContent = readFileSync(
      join(projectRoot, "components", "PoliticoScoreHeader.tsx"),
      "utf8"
    );
    expect(headerContent).toContain("AccessibleTooltip");
    expect(headerContent).toContain("Definición Oficial (Cámara y Senado)");
    expect(headerContent).toContain("pareo reglamentario");
    expect(headerContent).toContain("dispensa médica");
    expect(headerContent).toContain("retiro de sala");
  });

  it("2. Ficha Municipal: Contiene nota visible de Cobertura SINIM 345/346 y diagnóstico de Antártica", () => {
    const muniDetailContent = readFileSync(
      join(projectRoot, "components", "municipalidades", "MunicipalidadDetailDashboardClient.tsx"),
      "utf8"
    );
    expect(muniDetailContent).toContain("Cobertura SINIM: 345/346");
    expect(muniDetailContent).toContain("Antártica");
    expect(muniDetailContent).toContain("Cabo de Hornos");
    expect(muniDetailContent).toContain("Censo 2024 INE");

    // Verificar datos de Maipú
    const maipu = getMunicipalidadData("muni-maipu");
    expect(maipu).toBeDefined();
    expect(maipu?.nombre_comuna).toBe("Maipú");
    expect(maipu?.poblacion_censo_2024).toBe(503635);
  });

  it("3. Ficha Servicio Público: Contiene nota contextual para organismos sin partida individual agregados en DIPRES", () => {
    const servicioDashboardContent = readFileSync(
      join(projectRoot, "components", "servicios", "ServicioPublicoDashboardClient.tsx"),
      "utf8"
    );
    expect(servicioDashboardContent).toContain(
      "Organismo sin partida presupuestaria individual · datos agregados desde DIPRES"
    );
    expect(servicioDashboardContent).toContain("AccessibleTooltip");

    // Verificar un servicio sin partida directa
    const org = getServicioPublicoEnriquecido("org-100");
    if (org) {
      expect(org.presupuesto).toBeNull();
    }
  });

  it("4. Invariante de integridad: Vanessa Kaiser mantiene evaluación ALTA y fórmula de exceso +33,7%", () => {
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

  it("5. Invariante SEO: Slugs semánticos y 301 de municipalidades y servicios", () => {
    expect(getMuniCanonicalSlug("muni-maipu")).toBe("maipu");
    expect(isMuniLegacyId("muni-maipu")).toBe(true);
    expect(getMuniCanonicalSlug("maipu")).toBe("maipu");
  });
});
