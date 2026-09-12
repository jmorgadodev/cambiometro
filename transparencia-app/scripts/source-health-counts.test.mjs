import { describe, expect, it } from "vitest";
import { buildParliamentSourceHealth } from "./source-health-counts.mjs";

describe("source-health-counts", () => {
  it("separa Cámara por componente y no incorpora gastos al total base", () => {
    const result = buildParliamentSourceHealth({
      partitions: [
        { sourceId: "camara", variant: "asistencia_camara", recordCount: 54_538 },
        { sourceId: "camara", variant: "votaciones_camara", recordCount: 4_058 },
        { sourceId: "camara", variant: "congreso_opendata", recordCount: 155 },
        { sourceId: "gastos_camara", recordCount: 16_275 },
      ],
      sources: [],
    });

    expect(result.camara.recordCount).toBe(58_751);
    expect(result.camara.components).toEqual({
      asistencia: 54_538,
      votaciones: 4_058,
      datosAbiertos: 155,
      gastos: 16_275,
    });
  });

  it("mantiene compatibilidad con catálogos antiguos agregados", () => {
    const result = buildParliamentSourceHealth({
      partitions: [],
      sources: [
        { id: "camara", recordCount: 13_286 },
        { id: "senado", recordCount: 1_428 },
        { id: "votaciones_senado", recordCount: 189 },
        { id: "gastos_senado", recordCount: 6_543 },
      ],
    });

    expect(result.camara.recordCount).toBe(13_286);
    expect(result.senado.recordCount).toBe(1_428);
    expect(result.senado.components).toEqual({ votaciones: 189, gastos: 6_543 });
  });
});
