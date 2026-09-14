import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("resumen mensual de Transparencia Activa", () => {
  it("muestra el estado del corte sin presentar una gráfica o tabla mensual incompleta", () => {
    const summary = readFileSync(resolve(import.meta.dirname, "../components/remuneraciones/TransparencyActivaSummary.tsx"), "utf8");

    expect(summary).toContain("Estado del último corte");
    expect(summary).toContain("nuevos registros");
    expect(summary).toContain("que ya no aparecen");
    expect(summary).toContain("cambios de monto");
    expect(summary).not.toContain("TransparencyMonthlyChart");
    expect(summary).not.toContain("Ver detalle mensual de los últimos 12 cortes");
  });
});
