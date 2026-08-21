import { describe, expect, it } from "vitest";
import { partitionV7Records } from "../scripts/etl/v7-quarantine.mjs";

const record = (id: string, salary: number, hours: number) => ({
  id,
  nombre_completo: id,
  remuneracion_bruta_mensual: salary,
  horas_extras_mes_anterior: hours,
  periodo: "2026-06",
  url: `https://www.portaltransparencia.cl/${id}`,
});

describe("FIX-5 — cuarentena V7", () => {
  it("acepta los límites exactos de remuneración y horas", () => {
    const result = partitionV7Records([record("limite", 60_000_000, 300)]);
    expect(result.regular).toHaveLength(1);
    expect(result.anomalies).toHaveLength(0);
  });

  it("cuarentena $60.000.001 y conserva evidencia", () => {
    const result = partitionV7Records([record("sueldo", 60_000_001, 20)]);
    expect(result.regular).toHaveLength(0);
    expect(result.anomalies[0]).toEqual(expect.objectContaining({
      id: "sueldo",
      severity: "ALTA",
      violations: ["sueldo_mensual"],
      source_url: "https://www.portaltransparencia.cl/sueldo",
    }));
  });

  it("cuarentena 301 horas y conserva la fila sin alterarla", () => {
    const source = record("horas", 1_000_000, 301);
    const result = partitionV7Records([source]);
    expect(result.regular).toEqual([]);
    expect(result.anomalies[0]?.record).toEqual(source);
    expect(result.anomalies[0]?.violations).toEqual(["horas_extras"]);
  });
});
