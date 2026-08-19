import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getMunicipalidadData, getAllMunicipalidadesData } from "./municipalidades-data";
import { queryFallbackFuncionarios } from "./funcionarios-fallback";
import { MUNICIPALIDADES_SEED } from "./municipalidades";

describe("Ficha Comunal Enriquecida (/municipalidades/[id]) y Consolidado (/funcionarios)", () => {
  const pageSource =
    readFileSync(resolve("app/municipalidades/[id]/page.tsx"), "utf8") +
    readFileSync(resolve("components/municipalidades/MunicipalidadDetailDashboardClient.tsx"), "utf8");


  it("verifica las secciones y estructura enriquecida de /municipalidades/[id]", () => {
    // 1. Header con enlaces oficiales
    expect(pageSource).toContain("Web Municipal");
    expect(pageSource).toContain("Transparencia Activa CPLT");
    expect(pageSource).toContain("Ficha SINIM SUBDERE");

    // 2. Tabs del dashboard
    expect(pageSource).toContain("presupuesto");
    expect(pageSource).toContain("personal");
    expect(pageSource).toContain("compras");
    expect(pageSource).toContain("concejo");
    expect(pageSource).toContain("control");

    // 3. Concejo Municipal y Compras
    expect(pageSource).toContain("Concejo Municipal (SERVEL 2024 - 2028)");
    expect(pageSource).toContain("Contrataciones Públicas y Adquisiciones OCDS");
    expect(pageSource).toContain("Estándar OCDS");

    // 4. Auditorías CGR
    expect(pageSource).toContain("Informes y Auditorías de Contraloría General de la República");

    // 5. Nómina Detallada de Funcionarios
    expect(pageSource).toContain("OrganismoFuncionariosList");
  });


  it("verifica datos enriquecidos de comunas representativas (ej. Maipú, Las Condes, Santiago, Talca)", () => {
    const maipu = getMunicipalidadData("muni-maipu");
    expect(maipu).not.toBeNull();
    expect(maipu?.poblacion_censo_2024).toBeGreaterThan(500000);
    expect(maipu?.superficie_km2).toBeGreaterThan(100);
    expect(maipu?.presupuesto_per_capita_clp).toBeGreaterThan(0);

    const all = getAllMunicipalidadesData();
    expect(all.length).toBe(MUNICIPALIDADES_SEED.length);

    // Garantizar que el 100% de las 346 comunas tengan alcalde con remuneración bruta registrada
    const sinSueldo = all.filter((m) => !m.alcalde || !m.alcalde.remuneracion_bruta || m.alcalde.remuneracion_bruta <= 0);
    expect(sinSueldo.length).toBe(0);
  });

  it("verifica que el 100% de las 346 municipalidades tengan datos completos y alcaldes válidos", () => {
    const all = getAllMunicipalidadesData();
    expect(all.length).toBe(346);

    for (const m of all) {
      expect(m.poblacion_censo_2024).toBeGreaterThan(0);
      expect(m.superficie_km2).toBeGreaterThan(0);
      expect(m.resumen_personal?.total_funcionarios).toBeGreaterThan(0);
      expect(m.alcalde?.remuneracion_bruta).toBeGreaterThanOrEqual(3000000);
    }

    // Lolol debe tener al Alcalde
    const lolol = getMunicipalidadData("muni-lolol");
    expect(lolol).not.toBeNull();
    expect(lolol?.alcalde?.cargo).toBe("Alcalde");
    expect(lolol?.alcalde?.remuneracion_bruta).toBeGreaterThan(6000000);
    expect(lolol?.poblacion_censo_2024).toBe(7900);

    // Valparaíso debe tener a la Alcaldesa Camila Nieto Hernández
    const valpo = getMunicipalidadData("muni-valparaiso");
    expect(valpo).not.toBeNull();
    expect(valpo?.alcalde?.nombre).toContain("Camila Nieto");
    expect(valpo?.alcalde?.remuneracion_bruta).toBeGreaterThan(8000000);
  });
});
