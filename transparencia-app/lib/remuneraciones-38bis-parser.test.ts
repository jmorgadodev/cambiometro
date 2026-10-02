import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { compareRows, extractPeriod, latestCsvPeriod, parseCsvRows, parseRows, checksumRows, validate38BisSnapshot, validate38BisHistory } from "../scripts/etl/remuneraciones-38bis-parser.mjs";

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

  it("no confunde cambios de mayúsculas o tildes con entradas y salidas", () => {
    const previous = [{ partida: "Ministerio", organismo: "MINISTERIO", cargo: "ASESOR", nombre: "No reportado", bruto_mensual: null }];
    const current = [{ partida: "Ministerio", organismo: "MINISTERIO", cargo: "ASESOR", nombre: "NO REPORTADO", bruto_mensual: null }];
    expect(compareRows(previous, current)).toMatchObject({ entradas: 0, salidasObservadas: 0, cambios: 0 });
  });
});

describe("guardas del candidato 38 bis", () => {
  it("exige baseline R2, modo de verificación y preflight antes de escribir", () => {
    const workflow = readFileSync(new URL("../../.github/workflows/etl-remuneraciones-38bis.yml", import.meta.url), "utf8");
    expect(workflow).toContain("--require-published-baseline");
    expect(workflow).toContain("verify_release_only:");
    expect(workflow).toContain("assertRemoteR2WriteBudget");
    expect(workflow).toContain("steps.extract.outputs.changed == 'true'");
    expect(workflow).not.toContain("se usará el historial versionado");
    expect(workflow).not.toContain("se creará una línea base");
    expect(workflow).toContain("cancel-in-progress: false");
  });
  const rows = Array.from({ length: 600 }, (_, index) => ({ partida: "Congreso Nacional", organismo: "SENADO", cargo: "SENADOR", nombre: `PERSONA ${index}`, bruto_mensual: index === 0 ? null : index === 1 ? 0 : 100 }));
  const release = (registros = rows, mes: string | null = "2026-07") => ({ schema_version: 2, url: "https://comision38bis.gob.cl/registro-publico", mes, registros, filas: registros.length, checksum_sha256: checksumRows(registros) });
  it("rechaza período ausente o inválido sin inventar el mes de ejecución", () => {
    for (const month of [null, "2026-13"]) expect(() => validate38BisSnapshot(release(rows, month))).toThrow("PERIOD_INVALID");
  });
  it("rechaza una línea base corrupta antes de comparar", () => {
    expect(() => validate38BisSnapshot(release(), { previous: { ...release(), checksum_sha256: "0".repeat(64) } })).toThrow("CHECKSUM");
  });
  it("bloquea cero, duplicados exactos y descenso del mismo período", () => {
    expect(() => validate38BisSnapshot(release([]))).toThrow();
    expect(() => validate38BisSnapshot(release([...rows, rows[0]]))).toThrow("DUPLICATE");
    expect(() => validate38BisSnapshot(release(rows.slice(0, 599)), { previous: release() })).toThrow("REGRESSION");
  });
  it("permite diferencia mensual limitada pero bloquea retroceso y descenso anómalo", () => {
    expect(validate38BisSnapshot(release(rows.slice(0, 580), "2026-08"), { previous: release() }).status).toBe("valid_candidate");
    expect(() => validate38BisSnapshot(release(rows.slice(0, 530), "2026-08"), { previous: release() })).toThrow("REGRESSION");
    expect(() => validate38BisSnapshot(release(rows, "2026-06"), { previous: release() })).toThrow("PERIOD_REGRESSION");
  });
  it("mantiene nulo y cero y reconoce el mismo corte como no-op", () => {
    expect(validate38BisSnapshot(release(), { previous: release() }).status).toBe("unchanged");
    expect(rows[0].bruto_mensual).toBeNull();
    expect(rows[1].bruto_mensual).toBe(0);
  });
  it("valida cada período histórico y rechaza su sustitución por un fallback vacío", () => {
    const history = { schema_version: 1, source_id: "remuneraciones-38bis", periodos: [release(rows, "2026-06")] };
    expect(validate38BisHistory(history).periodos).toHaveLength(1);
    expect(() => validate38BisHistory({ ...history, periodos: [{ ...release(), filas: 1 }] })).toThrow("COUNT");
    expect(() => validate38BisHistory(null)).toThrow("HISTORY");
    expect(() => validate38BisHistory({ ...history, periodos: [release(), release()] })).toThrow("HISTORY");
    const repeated = release([...rows, rows[0]], "2026-06");
    expect(validate38BisHistory({ ...history, periodos: [repeated] }).periodos[0].registros).toHaveLength(601);
  });
});
