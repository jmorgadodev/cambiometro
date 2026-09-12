import { describe, expect, it } from "vitest";
import { extractPeriod, parseRows } from "../scripts/etl/remuneraciones-38bis-parser.mjs";

describe("parser del registro público 38 bis", () => {
  it("conserva las filas sin nombre o monto reportado", () => {
    const html = `
      <title>Registro de remuneraciones 2026-06</title>
      <tr><td>Ministerio</td><td>MINISTERIO</td><td>ASESOR</td><td>ANA ÁLVAREZ</td><td><span>$&nbsp;1.234.567</span></td></tr>
      <tr><td>Ministerio</td><td>MINISTERIO</td><td>ASESOR</td><td colspan="2">NO REPORTADO</td></tr>
    `;
    expect(extractPeriod(html)).toBe("2026-06");
    expect(parseRows(html)).toEqual([
      { partida: "Ministerio", organismo: "MINISTERIO", cargo: "ASESOR", nombre: "ANA ÁLVAREZ", bruto_mensual: 1234567 },
      { partida: "Ministerio", organismo: "MINISTERIO", cargo: "ASESOR", nombre: "NO REPORTADO", bruto_mensual: null },
    ]);
  });
});
