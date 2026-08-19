import { describe, it, expect } from "vitest";
import { calcularGastoAjustado, DISTRITOS } from "./territorio";

describe("Algoritmo de Índice de Complejidad Territorial", () => {
  it("contiene los 24 distritos electorales de Chile", () => {
    expect(DISTRITOS.length).toBeGreaterThanOrEqual(24);
  });

  it("aplica ajuste mayor a distritos extremos (Magallanes/Arica) que a la RM", () => {
    const gastoBruto = 20_000_000;

    const rm = calcularGastoAjustado(gastoBruto, 10); // RM
    const magallanes = calcularGastoAjustado(gastoBruto, 24); // Magallanes

    expect(magallanes.gasto_ajustado).toBeLessThan(rm.gasto_ajustado);
    expect(magallanes.indice).toBeGreaterThan(rm.indice);
  });
});
