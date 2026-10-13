import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { planCamaraAdvisoryMonths, validateCamaraAdvisoryRows, validateCamaraAdvisoryObservation } from "../scripts/etl/camara-external-advisories.mjs";

const published = { diputados: { "1009": { transparencia_camara: { asesorias_externas: {
  periods: [{ period: "septiembre 2026", status: "available", rows: [{ values: { Folio: "1" } }] }],
} } } } };

describe("actualización mensual acotada de asesorías Cámara", () => {
  it("acepta una tabla observada sin filas sin convertirla en un import cero", () => {
    const observation = { sourceUrl: "https://www.camara.cl/transparencia/asesoriasexternasgral.aspx",
      observedAt: new Date().toISOString(), observations: [{ period: "2026-10", rows: 0 }], imports: [] };
    expect(validateCamaraAdvisoryObservation(observation, published, "2026-10")).toEqual([]);
    expect(() => validateCamaraAdvisoryObservation({ ...observation, sourceUrl: "https://example.com" }, published, "2026-10")).toThrow("OBSERVATION_INVALID");
    expect(() => validateCamaraAdvisoryObservation({ ...observation, observations: [{ period: "2026-09", rows: 0 }] }, published, "2026-10")).toThrow("OBSERVATION_INVALID");
    expect(() => validateCamaraAdvisoryObservation({ ...observation, observations: [{ period: "2026-10", rows: 1 }] }, published, "2026-10")).toThrow("OBSERVATION_INCOMPLETE");
  });
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
  it("el importador usa el release indicado y conserva historial, personal y Senado", () => {
    const dir = mkdtempSync(join(tmpdir(), "camara-advisories-test-"));
    try {
      const input = join(dir, "current.json");
      const output = join(dir, "candidate.json");
      const file = join(dir, "AsesoriaExterna-2026-10.xls");
      const current = { ...published, generado_en: "2026-10-12T00:00:00Z", senadores: { "1": [{ nombre: "Registro conservado" }] },
        diputados: { "1009": { ...published.diputados["1009"], personal_apoyo: [{ nombre: "Registro conservado" }] } } };
      writeFileSync(input, JSON.stringify(current));
      // Fixture sintético de formato: nunca se publica ni se presenta como dato oficial.
      writeFileSync(file, "<table><tr><th>Folio</th><th>Asesor</th><th>Monto</th><th>Diputado</th></tr><tr><td>9999</td><td>Fixture</td><td>0</td><td>Alessandri V., Jorge</td></tr></table>");
      const result = spawnSync(process.execPath, [resolve("scripts/import-camara-external-advisories.mjs"),
        `--input=${input}`, `--file=${file}`, "--period=2026-10", `--output=${output}`, "--write"], { encoding: "utf8" });
      expect(result.status, result.stderr).toBe(0);
      const candidate = JSON.parse(readFileSync(output, "utf8"));
      expect(candidate.senadores).toEqual(current.senadores);
      expect(candidate.diputados["1009"].personal_apoyo).toEqual(current.diputados["1009"].personal_apoyo);
      const periods = candidate.diputados["1009"].transparencia_camara.asesorias_externas.periods;
      expect(periods.map((entry: { period: string }) => entry.period)).toEqual(["septiembre 2026", "octubre 2026"]);
      expect(periods[0]).toEqual(published.diputados["1009"].transparencia_camara.asesorias_externas.periods[0]);
      expect(periods[1].rows[0].values.Monto).toBe("0");
      expect(planCamaraAdvisoryMonths(candidate, "2026-10")).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
