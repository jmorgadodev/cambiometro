import { describe, expect, it } from "vitest";
import { latestBudgetSnapshot } from "../scripts/etl/presupuesto-snapshots.mjs";

describe("FIX-4 — snapshots acumulados DIPRES", () => {
  it("usa sólo el último período y no suma snapshots mensuales acumulados", () => {
    expect(latestBudgetSnapshot([
      { period: "2026-01", subtitulo: "21", denominacion: "Personal", inicial: 100, vigente: 120, ejecutado: 10 },
      { period: "2026-02", subtitulo: "21", denominacion: "Personal", inicial: 100, vigente: 130, ejecutado: 25 },
    ])).toEqual({
      period: "2026-02",
      subtitulos: [{ subtitulo: "21", denominacion: "Personal", inicial: 100, vigente: 130, ejecutado: 25 }],
    });
  });

  it("agrega filas del mismo subtítulo únicamente dentro del corte seleccionado", () => {
    expect(latestBudgetSnapshot([
      { period: "2026-02", subtitulo: "22", denominacion: "Bienes", inicial: 40, vigente: 50, ejecutado: 10 },
      { period: "2026-03", subtitulo: "22", denominacion: "Bienes", inicial: 40, vigente: 55, ejecutado: 15 },
      { period: "2026-03", subtitulo: "22", denominacion: "Bienes", inicial: 5, vigente: 6, ejecutado: 2 },
      { period: "2026-03", subtitulo: "21", denominacion: "Personal", inicial: 100, vigente: 110, ejecutado: 30 },
    ])).toEqual({
      period: "2026-03",
      subtitulos: [
        { subtitulo: "21", denominacion: "Personal", inicial: 100, vigente: 110, ejecutado: 30 },
        { subtitulo: "22", denominacion: "Bienes", inicial: 45, vigente: 61, ejecutado: 17 },
      ],
    });
  });

  it("devuelve un corte vacío cuando no hay registros válidos", () => {
    expect(latestBudgetSnapshot([])).toEqual({ period: null, subtitulos: [] });
  });
});
