import { describe, it, expect } from "vitest";
import {
  getAllOrganismos,
  getOrganismoById,
  getOrganismoByCpltId,
  getOrganismosByTipo,
  getOrganismosStats,
} from "./organismos";

describe("organismos canónicos y clasificación estatal", () => {
  it("carga el catálogo universal de organismos canónicos", () => {
    const todos = getAllOrganismos();
    expect(todos.length).toBeGreaterThan(800);
  });

  it("clasifica organismos en los tipos requeridos", () => {
    const stats = getOrganismosStats();
    expect(stats.total).toBeGreaterThan(800);
    expect(stats.porTipo["Municipalidad"]).toBeGreaterThan(340);
    expect(stats.porTipo["Ministerio"]).toBe(25);
    expect(stats.porTipo["GORE"]).toBeGreaterThanOrEqual(16);
    expect(stats.porTipo["Empresa pública"]).toBeGreaterThanOrEqual(7);
    expect(stats.porTipo["Servicio"]).toBeGreaterThan(10);
  });

  it("asigna códigos DIPRES a ministerios, GOREs y servicios (conDipres > 0)", () => {
    const stats = getOrganismosStats();
    expect(stats.conDipres).toBeGreaterThan(60);

    const minsal = getOrganismoById("min-salud");
    expect(minsal).toBeDefined();
    expect(minsal?.partida_capitulo_dipres).toBe("11");
    expect(minsal?.tipo).toBe("Ministerio");

    const goreValpo = getOrganismoById("gore-valparaiso");
    expect(goreValpo).toBeDefined();
    expect(goreValpo?.partida_capitulo_dipres).toBe("31/prog-08");

    const sii = getOrganismoById("serv-sii");
    expect(sii).toBeDefined();
    expect(sii?.partida_capitulo_dipres).toBe("05/04");
  });

  it("asigna códigos territoriales CUT a las municipalidades", () => {
    const maipu = getOrganismoById("muni-maipu");
    expect(maipu).toBeDefined();
    expect(maipu?.cut_si_municipio).toBe("13119");
    expect(maipu?.tipo).toBe("Municipalidad");

    const santiago = getOrganismoById("muni-santiago");
    expect(santiago).toBeDefined();
    expect(santiago?.cut_si_municipio).toBe("13101");
  });

  it("publica dotaciones sólo donde CPLT aporta registros oficiales", () => {
    const todos = getAllOrganismos();
    const conDotacion = todos.filter((organismo) => organismo.dotacion_total !== null);
    const munisConDotacion = todos.filter((organismo) => organismo.tipo === "Municipalidad" && organismo.dotacion_total !== null);
    const noMunisConDotacion = todos.filter((organismo) => organismo.tipo !== "Municipalidad" && organismo.dotacion_total !== null);

    expect(munisConDotacion).toHaveLength(320);
    expect(noMunisConDotacion.length).toBeGreaterThanOrEqual(16);
    expect(conDotacion.length).toBeGreaterThanOrEqual(336);
    expect(new Set(conDotacion.map((organismo) => organismo.dotacion_total)).size).toBeGreaterThan(1);

    const sence = getOrganismoById("serv-sence");
    expect(sence?.dotacion_total).toBe(1154);

    const minagri = getOrganismoById("min-agricultura");
    expect(minagri?.dotacion_total).toBeNull();
  });

  it("vincula compras públicas sólo con prueba de RUT exacto (R10)", () => {
    const todos = getAllOrganismos();
    for (const organismo of todos) {
      if (organismo.compras_ocds_metodo_enlace === "RUT_EXACTO") {
        expect(organismo.compras_ocds_rut_comprador).toMatch(/^\d{1,2}(?:\.\d{3}){2}-[0-9K]$/);
        expect(organismo.compras_ocds_monto_clp).not.toBeNull();
        expect(organismo.compras_ocds_procesos).not.toBeNull();
      } else {
        expect(organismo.compras_ocds_monto_clp).toBeNull();
        expect(organismo.compras_ocds_procesos).toBeNull();
      }
    }
  });

  it("resuelve búsqueda por cpltId e id", () => {
    const porId = getOrganismoById("min-interior");
    const porCplt = getOrganismoByCpltId("org-interior");
    expect(porId).toBeDefined();
    expect(porCplt).toBeDefined();
    expect(porId?.nombre_canonico).toContain("Interior");
  });
});
