import { describe, it, expect } from "vitest";
import { getMunicipalidadData } from "./municipalidades-data";
import { MUNICIPALIDADES_SEED } from "./municipalidades";

// Referencia: docs/datos-abiertos.md (Sección 8: Población Comunal y Presupuesto Per Cápita)
describe("Fichas Municipales: Población y Presupuesto Per Cápita (Censo 2024 INE)", () => {
  it("Maipú: población oficial Censo 2024 (503.635 hab.) desacoplada de la nómina (11.483 func.)", () => {
    const maipu = getMunicipalidadData("muni-maipu");
    expect(maipu).not.toBeNull();
    if (!maipu) return;

    const totalFuncionarios = maipu.resumen_personal?.total_funcionarios ?? 0;
    expect(maipu.poblacion_censo_2024).toBe(503635);
    expect(maipu.poblacion_censo_2024).not.toBe(totalFuncionarios);
    expect(totalFuncionarios).toBe(11483);

    // Presupuesto per cápita exacto
    const presVigente = maipu.presupuesto?.vigente_clp ?? 0;
    expect(presVigente).toBe(219402160000);
    expect(maipu.presupuesto_per_capita_clp).toBe(Math.round(219402160000 / 503635));
    expect(maipu.presupuesto_per_capita_clp).toBe(435637);
  });

  it("Comunas clave (Santiago, Las Condes): población oficial Censo 2024 y per cápita exacto", () => {
    const santiago = getMunicipalidadData("muni-santiago");
    expect(santiago?.poblacion_censo_2024).toBe(438856);
    expect(santiago?.presupuesto_per_capita_clp).toBe(
      Math.round((santiago?.presupuesto?.vigente_clp ?? 0) / 438856)
    );

    const lascondes = getMunicipalidadData("muni-lascondes");
    expect(lascondes?.poblacion_censo_2024).toBe(296134);
    expect(lascondes?.presupuesto_per_capita_clp).toBe(
      Math.round((lascondes?.presupuesto?.vigente_clp ?? 0) / 296134)
    );
  });

  it("Cobertura total: 346/346 comunas con población > 0 y suma nacional == 18.480.432", () => {
    expect(MUNICIPALIDADES_SEED.length).toBe(346);
    let sumaPoblacion = 0;

    for (const muni of MUNICIPALIDADES_SEED) {
      expect(muni.poblacion_censo_2024).toBeTypeOf("number");
      expect(muni.poblacion_censo_2024).toBeGreaterThan(0);
      sumaPoblacion += muni.poblacion_censo_2024 ?? 0;
    }

    expect(sumaPoblacion).toBe(18480432);
  });
});

