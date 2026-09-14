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

  it("conecta el historial R2 sólo dentro de la ficha de una persona", () => {
    const explorer = readFileSync(resolve(import.meta.dirname, "../components/remuneraciones/RemuneracionesUnifiedExplorer.tsx"), "utf8");
    const historyPanel = readFileSync(resolve(import.meta.dirname, "../components/remuneraciones/R2RemunerationHistoryPanel.tsx"), "utf8");

    expect(explorer).toContain("<R2RemunerationHistoryPanel");
    expect(explorer).toContain('sourceIds.has("transparencia-activa")');
    expect(historyPanel).toContain("/api/v1/remuneraciones/history?q=");
    expect(historyPanel).toContain("entradas observadas");
    expect(historyPanel).toContain("ausencias observadas");
    expect(historyPanel).toContain("cambios de monto");
  });
});
