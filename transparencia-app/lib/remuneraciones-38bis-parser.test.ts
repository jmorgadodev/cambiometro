import { describe, expect, it } from "vitest";
import { extractPeriod, latestCsvPeriod, parseCsvRows, parseRows } from "../scripts/etl/remuneraciones-38bis-parser.mjs";

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

  it("parsea el CSV oficial con comillas, acentos y monto no informado", () => {
    const csv = [
      'PERÍODO;"PARTIDA PRESUP";ORGANISMO;"CARGO O PERFIL";NOMBRES;APELLIDOS;"REMUNERACIÓN BRUTA DEL MES";"MONTO BRUTO"',
      '2026-06;Presidencia;PRESIDENCIA;"COORDINADOR DE ASESORES";"ANA ÁLVAREZ";;2900000;"NO REPORTADO"',
      '2026-05;"Congreso Nacional";SENADO;SENADOR;"PÉREZ";"GÓMEZ";"NO REPORTADO";7348983',
    ].join("\n");
    const rows = parseCsvRows(csv);
    expect(latestCsvPeriod(rows)).toBe("2026-06");
    expect(rows).toEqual([
      { periodo: "2026-06", partida: "Presidencia", organismo: "PRESIDENCIA", cargo: "COORDINADOR DE ASESORES", nombre: "ANA ÁLVAREZ", bruto_mensual: 2900000 },
      { periodo: "2026-05", partida: "Congreso Nacional", organismo: "SENADO", cargo: "SENADOR", nombre: "PÉREZ GÓMEZ", bruto_mensual: null },
    ]);
  });
});
