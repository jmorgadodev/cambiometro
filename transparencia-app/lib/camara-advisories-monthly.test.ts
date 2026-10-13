import { describe, expect, it } from "vitest";
import { planCamaraAdvisoryMonths, validateCamaraAdvisoryRows } from "../scripts/etl/camara-external-advisories.mjs";

const published = { diputados: { "1009": { transparencia_camara: { asesorias_externas: {
  periods: [{ period: "septiembre 2026", status: "available", rows: [{ values: { Folio: "1" } }] }],
} } } } };

describe("actualización mensual acotada de asesorías Cámara", () => {
  it("consulta sólo octubre, nunca vuelve a descargar enero–septiembre", () => {
    expect(planCamaraAdvisoryMonths(published, "2026-10")).toEqual(["2026-10"]);
  });
  it("no consulta meses futuros ni amplía a años anteriores", () => {
    expect(planCamaraAdvisoryMonths(published, "2026-09")).toEqual([]);
    expect(planCamaraAdvisoryMonths(published, "2027-01")).toEqual(["2026-10", "2026-11"]);
  });
  it("no permite arrancar desde un snapshot sin historial publicado", () => {
    expect(() => planCamaraAdvisoryMonths({ diputados: {} }, "2026-10")).toThrow("HISTORY_REQUIRED");
  });
  it("valida folio, monto, diputado y número de filas del export", () => {
    const rows = [{ values: { Folio: "3668", Asesor: "Asesor publicado", Monto: "$397.823", Diputado: "Alessandri V., Jorge" } }];
    expect(validateCamaraAdvisoryRows(rows, 1)).toEqual({ rows: 1, totalAmount: 397823 });
    expect(() => validateCamaraAdvisoryRows(rows, 2)).toThrow("ROW_COUNT_MISMATCH");
    expect(() => validateCamaraAdvisoryRows([...rows, ...rows], 2)).toThrow("DUPLICATE");
    expect(() => validateCamaraAdvisoryRows([{ values: { ...rows[0].values, Monto: "no informado" } }], 1)).toThrow("ROW_INVALID");
  });
  it("rechaza vacío o filas incompletas, en lugar de publicar cero", () => {
    expect(() => validateCamaraAdvisoryRows([], 0)).toThrow("EMPTY_MONTH");
    expect(() => validateCamaraAdvisoryRows([{ values: { Folio: "1", Asesor: "X", Monto: "0" } }], 1)).toThrow("ROW_INVALID");
  });
});
