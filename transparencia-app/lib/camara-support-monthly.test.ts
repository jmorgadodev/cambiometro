import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { validatePersonalApoyoDataset } from "../scripts/etl/personal-apoyo-publication.mjs";
import { planCamaraSupportMonths, validateCamaraSupportObservation, mergeCamaraSupportImportMetadata } from "../scripts/etl/camara-support-monthly.mjs";

const sourceUrl = "https://www.camara.cl/transparencia/personalapoyogral.aspx";
const published = { diputados: { "1009": { personal_apoyo_por_periodo: {
  "2026-03": { status: "available", rows: [{ nombre: "fixture" }] },
  "2026-09": { status: "available", rows: [{ nombre: "fixture" }] },
} } } };
const headers = ["Distrito", "Diputado", "", "Nombre", "Cargo", "Sueldo", "Cargo Elección (SERVEL)", "Inicio", "Cese de funciones", "Tipo", "Trabaja ademas para"];
const observation = () => ({ sourceUrl, observedAt: new Date().toISOString(), observations: [{ period: "2026-10", rows: 0, headers }], imports: [] });

describe("personal Cámara incremental desde el release vigente", () => {
  it("consulta sólo meses nuevos, como máximo dos y únicamente 2026", () => {
    expect(planCamaraSupportMonths(published, "2026-10")).toEqual(["2026-10"]);
    expect(planCamaraSupportMonths(published, "2026-09")).toEqual([]);
    expect(planCamaraSupportMonths(published, "2027-01")).toEqual(["2026-10", "2026-11"]);
    expect(() => planCamaraSupportMonths({ diputados: {} }, "2026-10")).toThrow("HISTORY_REQUIRED");
  });
  it("acepta cero observado sin importar ni reemplazar el histórico", () => {
    expect(validateCamaraSupportObservation(observation(), published, "2026-10")).toEqual([]);
    expect(published.diputados["1009"].personal_apoyo_por_periodo["2026-03"].rows).toHaveLength(1);
  });
  it("rechaza fuente, fecha, encabezados o meses incorrectos y observaciones incompletas", () => {
    for (const patch of [{ sourceUrl: "https://example.com" }, { observedAt: "2020-01-01" },
      { observations: [] }, { observations: [{ period: "2026-09", rows: 0, headers }] },
      { observations: [{ period: "2026-10", rows: 0, headers: [] }] },
      { observations: [{ period: "2026-10", rows: 1000, headers }] }]) {
      expect(() => validateCamaraSupportObservation({ ...observation(), ...patch }, published, "2026-10")).toThrow();
    }
    expect(() => validateCamaraSupportObservation({ ...observation(), observations: [
      { period: "2026-10", rows: 0, headers }, { period: "2026-11", rows: 0, headers },
    ] }, published, "2026-11")).toThrow();
  });
  it("exige captura íntegra del mes observado y conserva metadatos de meses anteriores", () => {
    const capture = { period: "2026-10", rows: 1000, file: "octubre.html", checksumSha256: "a".repeat(64),
      source: sourceUrl, captureFormat: "rendered-table-rows", retrievedAt: new Date().toISOString() };
    const observed = { ...observation(), observations: [{ period: "2026-10", rows: 1000, headers }], imports: [capture] };
    expect(validateCamaraSupportObservation(observed, published, "2026-10")).toEqual([capture]);
    expect(() => validateCamaraSupportObservation({ ...observed, imports: [{ ...capture, rows: 999 }] }, published, "2026-10")).toThrow();
    const previous = [{ period: "2026-03", rows: 1200, checksumSha256: "b".repeat(64) }];
    expect(mergeCamaraSupportImportMetadata(previous, [capture])).toEqual([...previous, capture]);
    expect(previous).toHaveLength(1);
  });
  it("el importador real agrega octubre sin perder meses, otras categorías ni Senado", () => {
    const dir = mkdtempSync(join(tmpdir(), "camara-support-monthly-"));
    const hash = (value: string) => createHash("sha256").update(value).digest("hex");
    try {
      // Datos sintéticos: ejercitan los umbrales reales sin red ni datos productivos.
      const deputies = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [String(1009 + i), {
        mes_personal: "septiembre 2026", personal_apoyo: Array.from({ length: 5 }, (_, n) => ({ nombre: `Fixture ${n}`, sueldo: 1 })),
        personal_apoyo_por_periodo: published.diputados["1009"].personal_apoyo_por_periodo,
        transparencia_camara: { asesorias_externas: { rows: [{ values: { Folio: "9999" } }] } },
      }]));
      const original = { generado_en: "2026-10-12T00:00:00Z", diputados: deputies,
        fuentes: { camara_personal_apoyo_historico: { periods: [{ period: "2026-03", rows: 1000 }] } },
        senadores: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [String(i), Array.from({ length: 13 }, () => ({ nombre: "Fixture Senado" }))])) };
      const input = JSON.stringify(original);
      writeFileSync(join(dir, "current.json"), input);
      writeFileSync(join(dir, "manifest.json"), JSON.stringify({ schemaVersion: "1.0.0", sourceId: "personal-apoyo",
        generatedAt: original.generado_en, checksumSha256: hash(input), ...validatePersonalApoyoDataset(original) }));
      writeFileSync(join(dir, "diputados-open-data.xml"), `<Diputados><Diputado><Id>1009</Id><Nombre>Jorge</Nombre><ApellidoPaterno>Alessandri</ApellidoPaterno><ApellidoMaterno>Vergara</ApellidoMaterno></Diputado>${Array.from({ length: 154 }, (_, i) => `<Diputado><Id>${2000 + i}</Id><Nombre>Fixture</Nombre><ApellidoPaterno>Otro${i}</ApellidoPaterno></Diputado>`).join("")}</Diputados>`);
      const table = `<table id="tabla"><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>${Array.from({ length: 500 }, (_, i) => `<tr><td>10</td><td>Alessandri V., Jorge</td><td></td><td>Fixture ${i}</td><td>Asesor</td><td>1</td><td></td><td>01/10/26</td><td></td><td>Contrato</td><td></td></tr>`).join("")}</table>`;
      writeFileSync(join(dir, "octubre.html"), table);
      writeFileSync(join(dir, "imports.json"), JSON.stringify([{ period: "2026-10", rows: 500, file: "octubre.html", source: sourceUrl,
        captureFormat: "rendered-table-rows", checksumSha256: hash(table), retrievedAt: new Date().toISOString() }]));
      const args = [resolve("scripts/import-camara-support-history.mjs"), "--manifest", join(dir, "imports.json"),
        "--input", join(dir, "current.json"), "--current-manifest", join(dir, "manifest.json"), "--output", join(dir, "candidate.json"), "--expected-periods", "2026-10", "--capture-dir", dir];
      const run = spawnSync(process.execPath, args, { encoding: "utf8" });
      expect(run.status, run.stderr).toBe(0);
      const candidate = JSON.parse(readFileSync(join(dir, "candidate.json"), "utf8"));
      expect(candidate.senadores).toEqual(original.senadores);
      expect(candidate.diputados["1009"].transparencia_camara).toEqual(deputies["1009"].transparencia_camara);
      expect(candidate.diputados["1009"].personal_apoyo_por_periodo["2026-03"]).toEqual(published.diputados["1009"].personal_apoyo_por_periodo["2026-03"]);
      expect(candidate.diputados["1009"].personal_apoyo_por_periodo["2026-09"]).toEqual(published.diputados["1009"].personal_apoyo_por_periodo["2026-09"]);
      expect(candidate.diputados["1009"].personal_apoyo_por_periodo["2026-10"].rows).toHaveLength(500);
      expect(candidate.fuentes.camara_personal_apoyo_historico.periods.map((entry: { period: string }) => entry.period)).toEqual(["2026-03", "2026-10"]);
      writeFileSync(join(dir, "octubre.html"), table + "[Truncated]");
      expect(spawnSync(process.execPath, args, { encoding: "utf8" }).stderr).toContain("CAPTURE_INVALID");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
