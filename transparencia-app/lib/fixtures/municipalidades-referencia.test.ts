import { describe, expect, it } from "vitest";
import { getMunicipalidadData, getAllMunicipalidadesData } from "../municipalidades-data";
import { getVerifiedMuniRRSS, VERIFIED_MUNICIPALIDADES_RRSS } from "../municipalidades-rrss";
import { MUNICIPALIDADES_SEED } from "../municipalidades";
import { SOURCE_CANONICAL_COUNTS } from "../published-sources";

/**
 * Fixture Externo Congelado — Ronda 3: Auditoría Periodística Municipalidades
 * 
 * Anclas oficiales congeladas:
 * - Censo 2024 INE (censo2024.ine.gob.cl)
 * - SINIM SUBDERE (sinim.gov.cl / datos.sinim.gov.cl)
 * - Registros Oficiales de Autoridades (Servel / BCN / CPLT)
 * - Redes Sociales y Sitios Web Oficiales Institucionales
 */

describe("Fixture Externo Congelado: Referencia Oficial de Municipalidades (Ronda 3)", () => {
  describe("1. Muestra de 5 Comunas Oficiales + Antártica", () => {
    it("Comuna 1: Maipú (CUT 13119 · Censo 503.635 · Per Cápita $435.637 · Alcalde Tomás Vodanovic)", () => {
      const muni = getMunicipalidadData("muni-maipu");
      expect(muni).not.toBeNull();
      expect(muni?.cut).toBe("13119");
      expect(muni?.nombre_comuna).toBe("Maipú");
      expect(muni?.poblacion_censo_2024).toBe(503635);
      expect(muni?.presupuesto?.vigente_clp).toBe(219402160000);
      expect(muni?.presupuesto?.inicial_clp).toBe(191211781000);

      const perCapitaCalc = Math.round((muni!.presupuesto!.vigente_clp!) / (muni!.poblacion_censo_2024!));
      expect(perCapitaCalc).toBe(435637);
      expect(muni?.presupuesto_per_capita_clp).toBe(435637);

      expect(muni?.alcalde?.nombre).toContain("Vodanovic");
      expect(muni?.sitio_web_oficial).toBe("https://www.municipalidadmaipu.cl");
      expect(muni?.redes_sociales?.twitter).toBe("https://x.com/MaipuCL");
      expect(muni?.redes_sociales?.instagram).toBe("https://www.instagram.com/maipu.cl");
      expect(muni?.redes_sociales?.facebook).toBe("https://www.facebook.com/maipu.cl");
      expect(muni?.redes_sociales?.youtube).toBe("https://www.youtube.com/@MunicipalidaddeMaipu");
    });

    it("Comuna 2: Santiago (CUT 13101 · Censo 438.856 · Per Cápita $564.738 · Alcalde Mario Desbordes)", () => {
      const muni = getMunicipalidadData("muni-santiago");
      expect(muni).not.toBeNull();
      expect(muni?.cut).toBe("13101");
      expect(muni?.nombre_comuna).toBe("Santiago");
      expect(muni?.poblacion_censo_2024).toBe(438856);
      expect(muni?.presupuesto?.vigente_clp).toBe(247838661000);
      expect(muni?.presupuesto?.inicial_clp).toBe(233978725000);

      const perCapitaCalc = Math.round((muni!.presupuesto!.vigente_clp!) / (muni!.poblacion_censo_2024!));
      expect(perCapitaCalc).toBe(564738);
      expect(muni?.presupuesto_per_capita_clp).toBe(564738);

      expect(muni?.alcalde?.nombre).toContain("Desbordes");
      expect(muni?.sitio_web_oficial).toBe("https://www.munistgo.cl");
      expect(muni?.redes_sociales?.twitter).toBe("https://x.com/Muni_Stgo");
      expect(muni?.redes_sociales?.instagram).toBe("https://www.instagram.com/munistgo");
      expect(muni?.redes_sociales?.facebook).toBe("https://www.facebook.com/munistgo");
      expect(muni?.redes_sociales?.youtube).toBe("https://www.youtube.com/c/MuniStgoVideos");
    });

    it("Comuna 3: Las Condes (CUT 13114 · Censo 296.134 · Per Cápita $1.740.680 · Alcaldesa Catalina San Martín)", () => {
      const muni = getMunicipalidadData("muni-lascondes");
      expect(muni).not.toBeNull();
      expect(muni?.cut).toBe("13114");
      expect(muni?.nombre_comuna).toBe("Las Condes");
      expect(muni?.poblacion_censo_2024).toBe(296134);
      expect(muni?.presupuesto?.vigente_clp).toBe(515474435000);
      expect(muni?.presupuesto?.inicial_clp).toBe(484750000000);

      const perCapitaCalc = Math.round((muni!.presupuesto!.vigente_clp!) / (muni!.poblacion_censo_2024!));
      expect(perCapitaCalc).toBe(1740680);
      expect(muni?.presupuesto_per_capita_clp).toBe(1740680);

      const alcaldeNombre = muni?.alcalde?.nombre ?? getVerifiedMuniRRSS("muni-lascondes")?.alcalde_oficial?.nombre;
      expect(alcaldeNombre).toContain("San Martín");
      expect(muni?.sitio_web_oficial).toBe("https://www.lascondes.cl");
      expect(muni?.redes_sociales?.twitter).toBe("https://x.com/muni_lascondes");
      expect(muni?.redes_sociales?.instagram).toBe("https://www.instagram.com/munilascondes/");
      expect(muni?.redes_sociales?.facebook).toBe("https://www.facebook.com/munilascondes/");
      expect(muni?.redes_sociales?.youtube).toBe("https://www.youtube.com/@lascondesmuni");
    });

    it("Comuna 4: Antofagasta (CUT 02101 · Censo 401.096 · Per Cápita $670.345 · Alcalde Sacha Razmilic)", () => {
      const muni = getMunicipalidadData("muni-antofagasta");
      expect(muni).not.toBeNull();
      expect(muni?.cut).toBe("02101");
      expect(muni?.nombre_comuna).toBe("Antofagasta");
      expect(muni?.poblacion_censo_2024).toBe(401096);
      expect(muni?.presupuesto?.vigente_clp).toBe(268872871000);
      expect(muni?.presupuesto?.inicial_clp).toBe(183541651000);

      const perCapitaCalc = Math.round((muni!.presupuesto!.vigente_clp!) / (muni!.poblacion_censo_2024!));
      expect(perCapitaCalc).toBe(670345);
      expect(muni?.presupuesto_per_capita_clp).toBe(670345);

      const alcaldeNombre = muni?.alcalde?.nombre ?? getVerifiedMuniRRSS("muni-antofagasta")?.alcalde_oficial?.nombre;
      expect(alcaldeNombre).toContain("Razmilic");
      expect(muni?.sitio_web_oficial).toBe("https://www.municipalidadantofagasta.cl");
      expect(muni?.redes_sociales?.twitter).toBe("https://x.com/AntofagastaMuni");
      expect(muni?.redes_sociales?.instagram).toBe("https://www.instagram.com/antofagastamuni/");
      expect(muni?.redes_sociales?.facebook).toBe("https://www.facebook.com/Municipalidad.Antofagasta");
      expect(muni?.redes_sociales?.youtube).toBe("https://www.youtube.com/user/Antofagastamuni");
    });

    it("Comuna 5: Punta Arenas (CUT 12101 · Censo 132.363 · Per Cápita $580.102 · Alcalde Claudio Radonich)", () => {
      const muni = getMunicipalidadData("muni-puntaarenas");
      expect(muni).not.toBeNull();
      expect(muni?.cut).toBe("12101");
      expect(muni?.nombre_comuna).toBe("Punta Arenas");
      expect(muni?.poblacion_censo_2024).toBe(132363);
      expect(muni?.presupuesto?.vigente_clp).toBe(76784029000);
      expect(muni?.presupuesto?.inicial_clp).toBe(71917610000);

      const perCapitaCalc = Math.round((muni!.presupuesto!.vigente_clp!) / (muni!.poblacion_censo_2024!));
      expect(perCapitaCalc).toBe(580102);
      expect(muni?.presupuesto_per_capita_clp).toBe(580102);

      const alcaldeNombre = muni?.alcalde?.nombre ?? getVerifiedMuniRRSS("muni-puntaarenas")?.alcalde_oficial?.nombre;
      expect(alcaldeNombre).toContain("Radonich");
      expect(muni?.sitio_web_oficial).toBe("https://www.puntaarenas.cl");
      expect(muni?.redes_sociales?.twitter).toBe("https://x.com/MuniPuntaArenas");
      expect(muni?.redes_sociales?.instagram).toBe("https://www.instagram.com/munipuntaarenas");
      expect(muni?.redes_sociales?.facebook).toBe("https://www.facebook.com/munipuntaarenas");
      expect(muni?.redes_sociales?.youtube).toBe("https://www.youtube.com/@munipuntaarenas");
    });

    it("Comuna Especial: Antártica (CUT 12202 · Censo 60 · Sin administración municipal propia)", () => {
      const muni = getMunicipalidadData("muni-antartica");
      expect(muni).not.toBeNull();
      expect(muni?.cut).toBe("12202");
      expect(muni?.nombre_comuna).toBe("Antártica");
      expect(muni?.tiene_municipalidad_propia).toBe(false);
      expect(muni?.poblacion_censo_2024).toBe(60);
      expect(muni?.presupuesto).toBeNull();
      expect(muni?.presupuesto_per_capita_clp).toBeNull();
      expect(muni?.alcalde).toBeNull();
      expect(muni?.sitio_web_oficial).toBeNull();
      expect(muni?.redes_sociales).toBeNull();
    });
  });

  describe("2. Regla R10: Verificación de Redes Sociales y Fuentes Primarias", () => {
    it("Las redes sociales verificadas poseen fuente primaria documentada y URLs institucionales", () => {
      for (const [id, rrssInfo] of Object.entries(VERIFIED_MUNICIPALIDADES_RRSS)) {
        if (rrssInfo.redes_sociales) {
          expect(rrssInfo.redes_sociales.fuente_verificacion).toBeDefined();
          expect(rrssInfo.redes_sociales.fuente_verificacion.length).toBeGreaterThan(5);
          
          if (rrssInfo.redes_sociales.twitter) {
            expect(rrssInfo.redes_sociales.twitter).toMatch(/^https:\/\/(x\.com|twitter\.com)\//);
          }
          if (rrssInfo.redes_sociales.instagram) {
            expect(rrssInfo.redes_sociales.instagram).toMatch(/^https:\/\/(www\.)?instagram\.com\//);
          }
          if (rrssInfo.redes_sociales.facebook) {
            expect(rrssInfo.redes_sociales.facebook).toMatch(/^https:\/\/(www\.)?facebook\.com\//);
          }
          if (rrssInfo.redes_sociales.youtube) {
            expect(rrssInfo.redes_sociales.youtube).toMatch(/^https:\/\/(www\.)?youtube\.com\//);
          }
        }
      }
    });

    it("Cobertura total de comunas y municipalidades se mantiene exacta (346 comunas, 345 SINIM)", () => {
      const all = getAllMunicipalidadesData();
      expect(all.length).toBe(346);
      
      const conMuniPropia = all.filter((m) => m.tiene_municipalidad_propia);
      expect(conMuniPropia.length).toBe(345);

      expect(SOURCE_CANONICAL_COUNTS["ine-censo-2024"]).toBe(346);
      expect(SOURCE_CANONICAL_COUNTS["sinim"]).toBe(3105);
    });
  });
});
