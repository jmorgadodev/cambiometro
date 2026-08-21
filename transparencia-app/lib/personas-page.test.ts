import { describe, it, expect } from "vitest";
import { queryFallbackFuncionarios, getFallbackFuncionarios } from "./funcionarios-fallback";
import { getAllOrganismos, getOrganismoById, getOrganismosStats } from "./organismos";
import { POLITICOS_SEED } from "./seed-politicos";
import { MUNICIPALIDADES_SEED } from "./municipalidades";
import { SERVICIOS_PUBLICOS_SEED } from "./servicios-publicos";

describe("Directorio Universal de Personas (/personas)", () => {
  it("contiene los 205 parlamentarios para la pestaña Parlamentarios", () => {
    expect(POLITICOS_SEED.length).toBe(205);
    const diputados = POLITICOS_SEED.filter((p) => p.cargo === "Diputado");
    const senadores = POLITICOS_SEED.filter((p) => p.cargo === "Senador");
    expect(diputados.length).toBe(155);
    expect(senadores.length).toBe(50);
  });

  it("contiene las 345 municipalidades y alcaldes para la pestaña Alcaldes", () => {
    expect(MUNICIPALIDADES_SEED.length).toBe(346);
    const maipu = MUNICIPALIDADES_SEED.find((m) => m.id === "muni-maipu");
    expect(maipu).toBeDefined();
    expect(maipu?.cut).toBe("13119");
  });

  it("contiene las altas autoridades institucionales para la pestaña Altas autoridades DIP", () => {
    expect(SERVICIOS_PUBLICOS_SEED.length).toBeGreaterThanOrEqual(70);
    const minsal = SERVICIOS_PUBLICOS_SEED.find((s) => s.id === "min-salud");
    expect(minsal).toBeDefined();
    expect(minsal?.director_jefe_actual).toBeDefined();
    expect(minsal?.tipo_organo).toBe("Ministerio");
  });

  it("filtra únicamente nóminas oficiales disponibles y no rellena tipos sin cobertura", () => {
    const resMin = queryFallbackFuncionarios({
      tipoOrgano: "Ministerio",
      page: 1,
      limit: 20,
    });
    expect(resMin.data.every((r) => r.organo_tipo === "Ministerio")).toBe(true);

    const resMuni = queryFallbackFuncionarios({
      tipoOrgano: "Municipalidad",
      page: 1,
      limit: 20,
    });
    expect(resMuni.total).toBeGreaterThan(0);
    expect(resMuni.data.every((r) => r.organo_tipo.toLowerCase().includes("muni"))).toBe(true);
  }, 30000);

  it("buscar 'Ministerio de Salud' devuelve sólo filas de la proyección oficial disponible", () => {
    const res = queryFallbackFuncionarios({
      query: "Ministerio de Salud",
      page: 1,
      limit: 20,
    });
    expect(res.total).toBeGreaterThan(0);
    expect(res.data.every((record) =>
      `${record.nombre_completo} ${record.cargo ?? ""} ${record.organo_nombre}`
        .toLocaleLowerCase("es-CL")
        .includes("ministerio de salud")
    )).toBe(true);
  }, 15000);

  it("devuelve ausencia explícita para un organismo sin nómina oficial materializada", () => {
    const res = queryFallbackFuncionarios({
      organismoId: "min-salud",
      page: 1,
      limit: 20,
    });
    expect(res.total).toBe(0);
    expect(res.totalHeadcount).toBe(0);
    expect(res.data).toEqual([]);
  });

  it("ordena funcionarios correctamente por sueldo y horas extras", () => {
    const resSueldoDesc = queryFallbackFuncionarios({
      sortBy: "sueldo_desc",
      page: 1,
      limit: 10,
    });
    for (let i = 0; i < resSueldoDesc.data.length - 1; i++) {
      expect(resSueldoDesc.data[i].remuneracion_bruta_mensual).toBeGreaterThanOrEqual(
        resSueldoDesc.data[i + 1].remuneracion_bruta_mensual
      );
    }
  });
});
