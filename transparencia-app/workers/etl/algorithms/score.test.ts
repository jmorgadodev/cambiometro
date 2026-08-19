import { describe, it, expect } from "vitest";
import { calcularScoreProbidad } from "./score";

describe("Algoritmo de Score de Probidad Unificado", () => {
  it("asigna score 100 a un politico impecable con 100% asistencia y sin alertas", () => {
    const res = calcularScoreProbidad({
      sesiones_asistidas: 100,
      sesiones_totales: 100,
      gasto_ajustado_promedio: 5_000_000,
      media_nacional_ajustada: 12_000_000,
      variacion_patrimonial_porcentaje: 0,
      cambios_declarados: 0,
      alertas_criticas: 0,
      alertas_altas: 0,
      alertas_medias: 0,
      incoherencias_rrss: 0,
      entidades_con_nepotismo: 0,
    });

    expect(res.score_total).toBe(100);
  });

  it("penaliza adecuadamente cuando existen alertas criticas e inasistencias", () => {
    const res = calcularScoreProbidad({
      sesiones_asistidas: 50,
      sesiones_totales: 100,
      gasto_ajustado_promedio: 30_000_000,
      media_nacional_ajustada: 12_000_000,
      variacion_patrimonial_porcentaje: 150,
      cambios_declarados: 6,
      alertas_criticas: 2,
      alertas_altas: 3,
      alertas_medias: 1,
      incoherencias_rrss: 2,
      entidades_con_nepotismo: 2,
    });

    expect(res.score_total).toBeLessThan(40);
  });
});
