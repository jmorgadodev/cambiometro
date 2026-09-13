import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("resumen mensual de Transparencia Activa", () => {
  it("presenta una visualización útil y deja el detalle tabular como consulta secundaria", () => {
    const summary = readFileSync(resolve(import.meta.dirname, "../components/remuneraciones/TransparencyActivaSummary.tsx"), "utf8");
    const chart = readFileSync(resolve(import.meta.dirname, "../components/remuneraciones/TransparencyMonthlyChart.tsx"), "utf8");

    expect(summary).toContain("<TransparencyMonthlyChart");
    expect(summary).toContain("Ver detalle mensual");
    expect(chart).toContain("Movimiento de personas");
    expect(chart).toContain("Montos publicados");
    expect(chart).toContain("Entradas");
    expect(chart).toContain("Salidas observadas");
    expect(chart).toContain("Comparación pendiente");
    expect(chart).toContain("No calculado");
    expect(chart).toContain("Tamaño de cada corte publicado");
    expect(chart).toContain("variación del corte");
    expect(chart).toContain("no equivale a entradas ni salidas");
    expect(chart).not.toContain("function positive(value: number | null)");
  });
});
