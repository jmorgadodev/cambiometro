import { describe, expect, it } from "vitest";
import {
  compareRemuneraciones38Bis,
  getRemuneraciones38BisRows,
  type Remuneracion38BisRelease,
} from "./remuneraciones-38bis";

const release = (mes: string, registros: Remuneracion38BisRelease["registros"]): Remuneracion38BisRelease => ({
  fuente: "Comisión 38 bis",
  url: "https://comision38bis.gob.cl/registro-publico",
  mes,
  extraido_en: "2026-09-08",
  filas: registros?.length ?? 0,
  registros,
});

describe("remuneraciones 38 bis", () => {
  it("conserva registros de ministerios además de los parlamentarios", () => {
    const current = release("2026-06", [
      { partida: "Congreso Nacional", organismo: "SENADO", cargo: "SENADOR", nombre: "Persona A", bruto_mensual: 8291039 },
      { partida: "Ministerio del Interior", organismo: "MINISTERIO DEL INTERIOR", cargo: "ASESOR JUNIOR", nombre: "Persona B", bruto_mensual: 1900000 },
    ]);

    expect(getRemuneraciones38BisRows(current)).toHaveLength(2);
    expect(getRemuneraciones38BisRows(current)[1].organismo).toBe("MINISTERIO DEL INTERIOR");
  });

  it("detecta entradas, salidas observadas y cambios de monto entre cortes", () => {
    const previous = release("2026-05", [
      { partida: "Ministerio", organismo: "ORGANISMO A", cargo: "ASESOR", nombre: "Ana Pérez", bruto_mensual: 1000000 },
      { partida: "Ministerio", organismo: "ORGANISMO B", cargo: "ASESOR", nombre: "Bruno Díaz", bruto_mensual: 1200000 },
    ]);
    const current = release("2026-06", [
      { partida: "Ministerio", organismo: "ORGANISMO A", cargo: "ASESOR", nombre: "ANA PEREZ", bruto_mensual: 1300000 },
      { partida: "Ministerio", organismo: "ORGANISMO C", cargo: "ASESOR", nombre: "Carla Soto", bruto_mensual: 1500000 },
    ]);

    const result = compareRemuneraciones38Bis(previous, current);
    expect(result.entradas.map((item) => item.nombre)).toEqual(["Carla Soto"]);
    expect(result.salidasObservadas.map((item) => item.nombre)).toEqual(["Bruno Díaz"]);
    expect(result.cambios).toHaveLength(1);
    expect(result.cambios[0]).toMatchObject({ brutoAnterior: 1000000, brutoActual: 1300000 });
  });

  it("no inventa entradas ni salidas en la primera publicación", () => {
    const result = compareRemuneraciones38Bis(null, release("2026-06", []));
    expect(result.estado).toBe("linea_base");
    expect(result.entradas).toHaveLength(0);
    expect(result.salidasObservadas).toHaveLength(0);
  });
});

