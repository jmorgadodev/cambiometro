import { describe, expect, it } from "vitest";
import { auditRemuneracionesArtifacts } from "../scripts/verify-remuneraciones-history.mjs";

describe("artefactos públicos de historial de remuneraciones", () => {
  it("mantiene alineados los contadores, tablas comparativas e índice histórico", () => {
    const report = auditRemuneracionesArtifacts({ root: process.cwd() });

    expect(report.ok).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.current.comparison).toMatchObject({
      periodo: "2026-06",
      anterior: "2026-05",
      entradas: 52,
      salidas_observadas: 50,
      cambios: 438,
    });
    expect(report.history.entries).toBeGreaterThan(0);
    expect(report.policy).toEqual({ d1Reads: 0, d1Writes: 0 });
  });
});
