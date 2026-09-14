import { describe, expect, it } from "vitest";
import { buildR2RemunerationHistory } from "./r2-remuneration-history";

describe("historial acotado de remuneraciones desde R2", () => {
  it("agrupa apellidos invertidos, conserva originales y compara sólo cortes consecutivos", () => {
    const first = { id: "r1", nombre_completo: "Romer Angel Rubio Flores", organo_nombre: "Ministerio", cargo: "Asesor", tipo_contrato: "Honorarios", periodo: "2026-01", remuneracion_bruta_mensual: 1_900_000, remuneracion_liquida_mensual: null, url: "https://example.test/1" };
    const second = { id: "r2", nombre_completo: "RUBIO FLORES, ROMER ANGEL", organo_nombre: "Ministerio", cargo: "Asesor", tipo_contrato: "Honorarios", periodo: "2026-02", remuneracion_bruta_mensual: 2_850_000, remuneracion_liquida_mensual: 0, url: "https://example.test/2" };
    const third = { id: "r3", nombre_completo: "Romer Angel Rubio Flores", organo_nombre: "Servicio", cargo: "Asesor", tipo_contrato: "Honorarios", periodo: "2026-04", remuneracion_bruta_mensual: null, url: "https://example.test/3" };
    const history = buildR2RemunerationHistory([first, second, third], { targetName: "Rubio Flores Romer Angel" });

    expect(history.source).toBe("r2");
    expect(history.people).toHaveLength(1);
    expect(history.people[0].names).toEqual(expect.arrayContaining([first.nombre_completo, second.nombre_completo]));
    expect(history.people[0].periods).toHaveLength(3);
    expect(history.people[0].comparisons[0]).toMatchObject({ from: "2026-01", to: "2026-02", comparable: true, entries: 0, exitsObserved: 0, organismChanges: false });
    expect(history.people[0].comparisons[0].amountChanges[0]).toMatchObject({ before: 1_900_000, after: 2_850_000, delta: 950_000 });
    expect(history.people[0].comparisons[1]).toMatchObject({ from: "2026-02", to: "2026-04", comparable: false, exitsObserved: null, organismChanges: true });
    expect(history.people[0].periods[0].records[0].original).toBe(first);
    expect(history.people[0].periods[1].records[0].grossState).toBe("reported");
    expect(history.people[0].periods[2].records[0].grossState).toBe("not_reported");
  });
});
