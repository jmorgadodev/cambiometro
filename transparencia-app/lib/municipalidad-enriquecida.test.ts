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
    expect(pageSource).toContain("Web oficial");
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
    expect(maipu?.poblacion_censo_2024).toBeNull();
    expect(maipu?.superficie_km2).toBeNull();
    expect(maipu?.presupuesto_per_capita_clp).toBeNull();

    const all = getAllMunicipalidadesData();
    expect(all.length).toBe(MUNICIPALIDADES_SEED.length);

    // R10 permite ausencia; sólo los registros con evidencia oficial pueden poblar el alcalde.
    for (const municipalidad of all) {
      if (!municipalidad.alcalde) continue;
      expect(municipalidad.alcalde.fuente).toMatch(/^https?:\/\//);
      expect(municipalidad.alcalde.remuneracion_bruta).toBeGreaterThan(0);
    }
  });

  it("mantiene 346 municipalidades sin completar ausencias con valores inventados", () => {
    const all = getAllMunicipalidadesData();
    expect(all.length).toBe(346);

    for (const m of all) {
      expect(m.poblacion_censo_2024 === null || m.poblacion_censo_2024 > 0).toBe(true);
      expect(m.superficie_km2 === null || m.superficie_km2 === undefined || m.superficie_km2 > 0).toBe(true);
      expect(m.resumen_personal === null || m.resumen_personal.total_funcionarios >= 0).toBe(true);
      expect(m.alcalde === null || (m.alcalde.remuneracion_bruta ?? 0) > 0).toBe(true);
    }
  });
});
