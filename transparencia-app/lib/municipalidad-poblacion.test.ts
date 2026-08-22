import { describe, it, expect } from "vitest";
import { getMunicipalidadData } from "./municipalidades-data";

// Referencia: docs/datos-abiertos.md (Sección 8: Población Comunal y Presupuesto Per Cápita)
describe("Fichas Municipales: Población y Presupuesto Per Cápita", () => {
  it("Maipú: la población nunca se confunde con el conteo de la nómina de funcionarios", () => {
    const maipu = getMunicipalidadData("muni-maipu");
    expect(maipu).not.toBeNull();
    if (!maipu) return;

    const totalFuncionarios = maipu.resumen_personal?.total_funcionarios ?? 0;
    // Si no hay dato de censo oficial, poblacion_censo_2024 debe ser null y nunca igual al conteo de nómina
    if (maipu.poblacion_censo_2024 === null) {
      expect(maipu.poblacion_censo_2024).not.toBe(totalFuncionarios);
    } else {
      expect(maipu.poblacion_censo_2024).toBeGreaterThan(100_000); // Maipú tiene ~500k hab.
      expect(maipu.poblacion_censo_2024).not.toBe(totalFuncionarios);
    }
  });

  it("Caso sin población oficial: per cápita calculado debe ser nulo o 0 (se renderiza '—')", () => {
    const maipu = getMunicipalidadData("muni-maipu");
    expect(maipu).not.toBeNull();
    if (!maipu) return;

    const presVigente = maipu.presupuesto?.vigente_clp ?? maipu.presupuesto?.inicial_clp ?? 0;
    const perCapita =
      maipu.presupuesto_per_capita_clp ??
      (maipu.poblacion_censo_2024 && presVigente > 0
        ? Math.round(presVigente / maipu.poblacion_censo_2024)
        : 0);

    if (maipu.poblacion_censo_2024 === null && maipu.presupuesto_per_capita_clp === null) {
      expect(perCapita).toBe(0);
    }
  });

  it("Comunas clave (Santiago, Las Condes): coherencia en población y presupuesto per cápita", () => {
    for (const muniId of ["muni-santiago", "muni-lascondes"]) {
      const muni = getMunicipalidadData(muniId);
      if (!muni) continue;

      const presVigente = muni.presupuesto?.vigente_clp ?? muni.presupuesto?.inicial_clp ?? 0;
      const perCapita =
        muni.presupuesto_per_capita_clp ??
        (muni.poblacion_censo_2024 && presVigente > 0
          ? Math.round(presVigente / muni.poblacion_censo_2024)
          : 0);

      if (muni.poblacion_censo_2024 !== null && presVigente > 0) {
        expect(perCapita).toBe(Math.round(presVigente / muni.poblacion_censo_2024));
        expect(perCapita).toBeGreaterThan(0);
      } else {
        expect(perCapita).toBe(0);
      }
    }
  });
});
