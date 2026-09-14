import { describe, expect, it } from "vitest";
import {
  finalizeFuncionarioQuality,
  normalizeFuncionarioCompensation,
  normalizeFuncionarioName,
} from "../funcionarios-normalization.mjs";

describe("contrato común de normalización de funcionarios", () => {
  it("mantiene el nombre original al retirar un prefijo inequívoco", () => {
    const name = normalizeFuncionarioName(". EZZIO   BRAZZODURO");

    expect(name).toEqual({
      nombre: "EZZIO BRAZZODURO",
      original: ". EZZIO BRAZZODURO",
      incidencias: ["nombre_prefijo_invalido"],
    });
  });

  it("distingue líquido no informado de líquido válido", () => {
    const result = normalizeFuncionarioCompensation({ bruto: 1_000_000, liquido: 0 });

    expect(result).toMatchObject({
      bruto: 1_000_000,
      liquido: null,
      liquidoOriginal: 0,
      incidencia: "remuneracion_liquida_no_informada",
    });
  });

  it("conserva el orden de incidencias entre nombre y remuneración", () => {
    const name = normalizeFuncionarioName("0 Ana Pérez");
    const compensation = normalizeFuncionarioCompensation({ bruto: 1_000_000, liquido: 0 });
    const quality = finalizeFuncionarioQuality(name, compensation);

    expect(quality.incidencias).toEqual([
      "nombre_prefijo_numerico",
      "remuneracion_liquida_no_informada",
    ]);
    expect(quality.calidad_datos.estado).toBe("normalizado");
  });
});
