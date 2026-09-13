import { describe, expect, it } from "vitest";
import { normalizeFuncionarioRecord } from "./funcionarios-normalization";

describe("normalización trazable de funcionarios", () => {
  it("quita un prefijo de puntuación sin ocultar el nombre original", () => {
    const result = normalizeFuncionarioRecord({
      id: "1",
      nombre_completo: ". Ezzio Brazzoduro",
      remuneracion_bruta_mensual: 1_000_000,
      remuneracion_liquida_mensual: 987_000,
    });

    expect(result.nombre_completo).toBe("Ezzio Brazzoduro");
    expect(result.nombre_completo_original).toBe(". Ezzio Brazzoduro");
    expect(result.calidad_datos?.incidencias).toContain("nombre_prefijo_invalido");
  });

  it("quita un prefijo numérico aislado, pero no inventa datos", () => {
    const result = normalizeFuncionarioRecord({
      id: "2",
      nombre_completo: "0 Albornoz Sepulveda",
      remuneracion_bruta_mensual: 3_428_801,
      remuneracion_liquida_mensual: 2_654_291,
    });

    expect(result.nombre_completo).toBe("Albornoz Sepulveda");
    expect(result.calidad_datos?.incidencias).toContain("nombre_prefijo_numerico");
    expect(result.nombre_completo).not.toContain("Albornoz Albornoz");
  });

  it("no publica un sueldo líquido cero como si fuera un pago real", () => {
    const result = normalizeFuncionarioRecord({
      id: "3",
      nombre_completo: "Ana Pérez",
      remuneracion_bruta_mensual: 1_000_000,
      remuneracion_liquida_mensual: 0,
    });

    expect(result.remuneracion_liquida_mensual).toBeNull();
    expect(result.remuneracion_liquida_mensual_original).toBe(0);
    expect(result.calidad_datos?.incidencias).toContain("remuneracion_liquida_no_informada");
  });

  it("preserva registros correctos sin alterarlos", () => {
    const result = normalizeFuncionarioRecord({
      id: "4",
      nombre_completo: "Ana Pérez",
      remuneracion_bruta_mensual: 1_000_000,
      remuneracion_liquida_mensual: 800_000,
    });

    expect(result.nombre_completo).toBe("Ana Pérez");
    expect(result.nombre_completo_original).toBeUndefined();
    expect(result.remuneracion_liquida_mensual).toBe(800_000);
    expect(result.calidad_datos?.incidencias).toEqual([]);
  });

  it("conserva el líquido original cuando llega desde un índice compacto", () => {
    const result = normalizeFuncionarioRecord({
      id: "5",
      nombre_completo: "Ana Pérez",
      remuneracion_bruta_mensual: 1_000_000,
      remuneracion_liquida_mensual: null,
      remuneracion_liquida_mensual_original: 0,
    });

    expect(result.remuneracion_liquida_mensual).toBeNull();
    expect(result.remuneracion_liquida_mensual_original).toBe(0);
  });
});
