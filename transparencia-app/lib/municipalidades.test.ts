import { describe, expect, it } from "vitest";
import { MUNICIPALIDADES_SEED } from "./municipalidades";
import { createMunicipalityRegistry } from "../scripts/etl/municipality-registry.mjs";

describe("catalogo territorial oficial de SUBDERE", () => {
  it("incluye las 346 comunas y exactamente 345 administraciones municipales", () => {
    expect(MUNICIPALIDADES_SEED).toHaveLength(346);
    expect(MUNICIPALIDADES_SEED.filter((comuna) => comuna.tiene_municipalidad_propia)).toHaveLength(345);
  });

  it("usa CUT unicos y no contiene autoridades ni indicadores de relleno", () => {
    expect(new Set(MUNICIPALIDADES_SEED.map((comuna) => comuna.cut)).size).toBe(346);
    expect(MUNICIPALIDADES_SEED.every((comuna) => /^\d{5}$/.test(comuna.cut))).toBe(true);
    expect(MUNICIPALIDADES_SEED.every((comuna) => comuna.alcalde_actual === null)).toBe(true);
    expect(MUNICIPALIDADES_SEED.every((comuna) => comuna.partido_alcalde === null)).toBe(true);
    expect(MUNICIPALIDADES_SEED.every((comuna) => comuna.poblacion_censo_2024 === null)).toBe(true);
  });

  it("asocia Antartica a la Municipalidad de Cabo de Hornos", () => {
    const antartica = MUNICIPALIDADES_SEED.find((comuna) => comuna.cut === "12202");
    expect(antartica).toMatchObject({
      id: "muni-antartica",
      tiene_municipalidad_propia: false,
      administracion_municipal_id: "muni-cabodehornos",
    });
  });
});

describe("clasificacion de organismos municipales CPLT", () => {
  const registry = createMunicipalityRegistry(MUNICIPALIDADES_SEED);

  it.each([
    ["Municipalidad de Maipu", "muni-maipu"],
    ["I. Municipalidad de Maipu", "muni-maipu"],
    ["Ilustre Municipalidad de Maipú", "muni-maipu"],
    ["Municipalidad de Cabo de Hornos y Antártica", "muni-cabodehornos"],
    ["Municipalidad de Isla de Pascua (Rapa Nui)", "muni-isladepascua"],
    ["Municipalidad de La Calera", "muni-lacalera"],
    ["Municipalidad de Llay Llay", "muni-llayllay"],
    ["Municipalidad de Marchige", "muni-marchigue"],
    ["Municipalidad de Puerto Natales", "muni-natales"],
    ["Municipalidad de Trehuaco", "muni-treguaco"],
  ])("resuelve %s", (officialName, expected) => {
    expect(registry.resolve(officialName)).toBe(expected);
  });

  it("rechaza una municipalidad desconocida en vez de publicarla como servicio", () => {
    expect(() => registry.resolve("Municipalidad de Comuna Inventada")).toThrow("CPLT_UNKNOWN_MUNICIPALITY");
  });
});
