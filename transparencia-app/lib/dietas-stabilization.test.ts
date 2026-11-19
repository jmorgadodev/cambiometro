import { describe, expect, it } from "vitest";
import { buildParliamentarySalaryView } from "../scripts/etl/remuneraciones-38bis-parliamentary.mjs";
import { checksumRows, SOURCE_URL, validate38BisSnapshot, parseRows } from "../scripts/etl/remuneraciones-38bis-parser.mjs";
const deputy = { partida: "Congreso Nacional", organismo: "Cámara", cargo: "DIPUTADO", nombre: "Ana Pérez", bruto_mensual: 8_000_000 };
const senator = { partida: "Congreso Nacional", organismo: "Senado", cargo: "SENADOR", nombre: "Juan Soto", bruto_mensual: 8_000_000 };
const history = () => ({ periodos: [
  { mes: "2026-06", registros: [deputy, senator] },
  { mes: "2026-07", registros: [{ ...deputy, bruto_mensual: 8_200_000 }] },
] });
describe("referencia oficial de dietas", () => {
  it("no inventa importes al leer textos con cifras, negativos o separadores incorrectos", () => {
    for (const value of ["No reportado 2026", "-8.239.091", "8.239.091,50", "8.23.91"]) {
      const html = `<table><tr><td>Congreso Nacional</td><td>Cámara</td><td>DIPUTADO</td><td>Ana Pérez</td><td>${value}</td></tr></table>`;
      expect(parseRows(html)[0].bruto_mensual).toBeNull();
    }
  });
  it("conserva el último importe por persona, aunque el último corte completo sea anterior", () => {
    const view = buildParliamentarySalaryView({ mes: "2026-08", registros: [] }, history(), { expectedRows: 2 });
    expect(view.congreso.map((row: { nombre: string; mes: string; bruto_mensual: number }) => [row.nombre, row.mes, row.bruto_mensual])).toEqual([
      ["Ana Pérez", "2026-07", 8_200_000], ["Juan Soto", "2026-06", 8_000_000],
    ]);
  });
  it("null o cero nuevos no rebajan a cero la última dieta conocida", () => {
    for (const amount of [null, 0]) {
      const view = buildParliamentarySalaryView({ mes: "2026-08", registros: [{ ...deputy, bruto_mensual: amount }] }, history(), { expectedRows: 2 });
      expect(view.congreso[0]).toMatchObject({ nombre: "Ana Pérez", mes: "2026-07", bruto_mensual: 8_200_000 });
    }
  });
  it("no acepta montos fraccionarios o fuera del rango seguro como dieta oficial", () => {
    for (const amount of [8_000_000.5, Number.MAX_SAFE_INTEGER + 1, -1]) {
      expect(() => buildParliamentarySalaryView({ mes: "2026-08", registros: [{ ...deputy, bruto_mensual: amount }] }, history(), { expectedRows: 2 })).toThrow("AMOUNT_INVALID");
    }
  });
  it("rechaza meses históricos inválidos y repetidos", () => {
    for (const periods of [[{ mes: "2026-00", registros: [deputy, senator] }], [history().periodos[0], history().periodos[0]]]) {
      expect(() => buildParliamentarySalaryView({ mes: "2026-08", registros: [] }, { periodos: periods }, { expectedRows: 2 })).toThrow("HISTORY_PERIOD");
    }
  });
  it("los cargos administrativos del Congreso no sustituyen una dieta parlamentaria", () => {
    const view = buildParliamentarySalaryView({ mes: "2026-08", registros: [{ ...deputy, cargo: "SECRETARIO DE LA CÁMARA" }] }, history(), { expectedRows: 2 });
    expect(view.congreso[0].cargo).toBe("DIPUTADO");
  });
  it("retiene una identidad ambigua en un corte intermedio", () => {
    const source = history(); source.periodos[1].registros.push({ ...deputy, bruto_mensual: 8_300_000 });
    expect(() => buildParliamentarySalaryView({ mes: "2026-08", registros: [] }, source, { expectedRows: 2 })).toThrow(/AMBIGUOUS|IDENTITY_MISMATCH/);
  });
  it("una corrección del mismo mes no elimina una dieta positiva ya verificada", () => {
    const rows = [deputy, ...Array.from({ length: 499 }, (_, i) => ({ partida: "Ministerio", organismo: "Ministerio", cargo: "Asesor", nombre: `Persona ${i}`, bruto_mensual: 1 }))];
    const previous = { url: SOURCE_URL, mes: "2026-07", filas: rows.length, registros: rows, checksum_sha256: checksumRows(rows) };
    for (const amount of [null, 0]) {
      const records = [{ ...deputy, bruto_mensual: amount }, ...rows.slice(1)];
      const candidate = { ...previous, registros: records, checksum_sha256: checksumRows(records) };
      expect(() => validate38BisSnapshot(candidate, { previous })).toThrow("CONGRESS_REFERENCE_LOSS");
    }
  });
});
