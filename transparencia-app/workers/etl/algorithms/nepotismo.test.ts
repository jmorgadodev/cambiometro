import { describe, it, expect } from "vitest";
import { detectarNepotismo } from "./nepotismo";

describe("Algoritmo de Detección de Nepotismo", () => {
  it("detecta coincidencia crítica de ambos apellidos (1er grado)", () => {
    const autoridad = { nombre_completo: "Juan Antonio Coloma Correa" };
    const relacionado = { nombre_completo: "Carlos Coloma Correa" };

    const res = detectarNepotismo(autoridad, relacionado);
    expect(res.coincide).toBe(true);
    expect(res.nivel).toBe("critico");
  });

  it("detecta coincidencia alta en apellido paterno (2do grado)", () => {
    const autoridad = { nombre_completo: "Camila Flores Oporto" };
    const relacionado = { nombre_completo: "Pedro Flores Silva" };

    const res = detectarNepotismo(autoridad, relacionado);
    expect(res.coincide).toBe(true);
    expect(res.nivel).toBe("alto");
  });

  it("retorna ninguna coincidencia para nombres sin relacion de apellidos", () => {
    const autoridad = { nombre_completo: "Gonzalo Winter Etcheberry" };
    const relacionado = { nombre_completo: "Maria Jose Rodriguez Lopez" };

    const res = detectarNepotismo(autoridad, relacionado);
    expect(res.coincide).toBe(false);
    expect(res.nivel).toBe("ninguno");
  });
});
