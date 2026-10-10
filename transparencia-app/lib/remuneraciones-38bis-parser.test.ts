import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { shouldVerify38BisPublication, validate38BisArtifacts } from "../scripts/etl/remuneraciones-38bis-publication.mjs";
import { buildHistory, compareRows, extractPeriod, latestCsvPeriod, parseCsvRows, parseRows, checksumRows, validate38BisSnapshot, validate38BisHistory } from "../scripts/etl/remuneraciones-38bis-parser.mjs";

describe("parser del registro público 38 bis", () => {
  it("conserva la causa de conexión al agotar reintentos sin ejecutar el ETL", async () => {
    const script = readFileSync(new URL("../scripts/etl-remuneraciones-38bis.mjs", import.meta.url), "utf8");
    const functionSource = script.slice(script.indexOf("async function fetchWithRetry("), script.indexOf("\nfunction readJson("));
    const networkError = new TypeError("fetch failed", { cause: new Error("connect timeout") });
    const fetchWithRetry = runInNewContext(`${functionSource}\nfetchWithRetry`, {
      AbortController, setTimeout, clearTimeout,
      fetch: async () => { throw networkError; },
    }) as (url: string, attempts: number) => Promise<Response>;
    await expect(fetchWithRetry("https://comision38bis.gob.cl/registro-publico", 1)).rejects.toMatchObject({
      message: expect.stringContaining("tras 1 intentos: fetch failed"),
      cause: networkError,
    });
  });

  it("conserva las filas sin nombre o monto reportado", () => {
    const html = `
      <title>Registro de remuneraciones 2026-06</title>
      <tr><td>Ministerio</td><td>MINISTERIO</td><td>ASESOR</td><td>ANA ÁLVAREZ</td><td><span>$&nbsp;1.234.567</span></td></tr>
      <tr><td>Ministerio</td><td>MINISTERIO</td><td>ASESOR</td><td colspan="2">NO REPORTADO</td></tr>
    `;
    expect(extractPeriod(html)).toBe("2026-06");
    expect(parseRows(html)).toEqual([
      { partida: "Ministerio", organismo: "MINISTERIO", cargo: "ASESOR", nombre: "ANA ÁLVAREZ", bruto_mensual: 1234567, bruto_mensual_texto_fuente: "$ 1.234.567", bruto_mensual_estado_fuente: "informado" },
      { partida: "Ministerio", organismo: "MINISTERIO", cargo: "ASESOR", nombre: "NO REPORTADO", bruto_mensual: null, bruto_mensual_texto_fuente: "", bruto_mensual_estado_fuente: "sin_celda" },
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
      { periodo: "2026-06", partida: "Presidencia", organismo: "PRESIDENCIA", cargo: "COORDINADOR DE ASESORES", nombre: "ANA ÁLVAREZ", bruto_mensual: 2900000, bruto_mensual_texto_fuente: "2900000", bruto_mensual_estado_fuente: "informado" },
      { periodo: "2026-05", partida: "Congreso Nacional", organismo: "SENADO", cargo: "SENADOR", nombre: "PÉREZ GÓMEZ", bruto_mensual: null, bruto_mensual_texto_fuente: "NO REPORTADO", bruto_mensual_estado_fuente: "no_reportado" },
    ]);
  });

  it("conserva la situación oficial sin convertirla en el nombre de una persona", () => {
    const csv = [
      'PERÍODO;"PARTIDA PRESUP";ORGANISMO;"CARGO O PERFIL";SITUACION;FUNCIÓN;NOMBRES;APELLIDOS;"REMUNERACIÓN BRUTA DEL MES"',
      '2026-04;"Ministerio de Educación";"SEREMI DE MAGALLANES";SEREMI;"VACANTE: EL CARGO ESTÁ DESOCUPADO";;;;',
      '2026-04;"Ministerio del Interior";"AGENCIA NACIONAL DE INTELIGENCIA";DIRECTOR;"NO APLICA: EL ORGANISMO NO CUENTA CON ESTE CARGO";;;;',
      '2026-04;"Ministerio de Salud";"SERVICIO DE SALUD";ASESOR;"NO REPORTADO";;;;',
    ].join("\n");

    expect(parseCsvRows(csv).map(({ nombre, situacion_fuente }) => [nombre, situacion_fuente])).toEqual([
      ["NO REPORTADO", "VACANTE: EL CARGO ESTÁ DESOCUPADO"],
      ["NO REPORTADO", "NO APLICA: EL ORGANISMO NO CUENTA CON ESTE CARGO"],
      ["NO REPORTADO", undefined],
    ]);
  });

  it("reconcilia sólo los meses pedidos con el CSV oficial y bloquea filas discordantes", () => {
    const previous = { mes: "2026-06", filas: 1, checksum_sha256: "stale", registros: [{ partida: "Ministerio", organismo: "SEREMI", cargo: "SEREMI", nombre: "NO REPORTADO", bruto_mensual: null }] };
    const previousHistory = { schema_version: 1, source_id: "remuneraciones-38bis", periodos: [{ mes: "2026-04", filas: 1, checksum_sha256: "stale", registros: [{ partida: "Ministerio", organismo: "SEREMI", cargo: "SEREMI", nombre: "NO REPORTADO", bruto_mensual: null }] }] };
    const csvRows = [
      { periodo: "2026-04", partida: "Ministerio", organismo: "SEREMI", cargo: "SEREMI", nombre: "NO REPORTADO", situacion_fuente: "VACANTE: EL CARGO ESTÁ DESOCUPADO", bruto_mensual: null },
      { periodo: "2026-06", partida: "Ministerio", organismo: "SEREMI", cargo: "SEREMI", nombre: "NO REPORTADO", situacion_fuente: "VACANTE: EL CARGO ESTÁ DESOCUPADO", bruto_mensual: null },
      { periodo: "2026-07", partida: "Ministerio", organismo: "SEREMI", cargo: "SEREMI", nombre: "NOMBRE REPORTADO", bruto_mensual: 100 },
    ];
    const current = { mes: "2026-07", extraido_en: "2026-10-09T00:00:00.000Z" };

    const reconciled = buildHistory(previous, previousHistory, current, { csvRows, reconcilePeriods: ["2026-04", "2026-06"] });

    expect(reconciled.periodos.map((period) => [period.mes, period.registros[0].nombre, period.registros[0].situacion_fuente])).toEqual([
      ["2026-06", "NO REPORTADO", "VACANTE: EL CARGO ESTÁ DESOCUPADO"],
      ["2026-04", "NO REPORTADO", "VACANTE: EL CARGO ESTÁ DESOCUPADO"],
    ]);
    expect(validate38BisHistory(reconciled).periodos).toHaveLength(2);
    const workflow = readFileSync(new URL("../../.github/workflows/etl-remuneraciones-38bis.yml", import.meta.url), "utf8");
    expect(workflow).toContain("history_reconciled");
    expect(workflow).toContain("history_checksum_sha256");
    expect(() => buildHistory(previous, previousHistory, current, { csvRows: csvRows.slice(1), reconcilePeriods: ["2026-04"] })).toThrow("38BIS_HISTORY_RECONCILE_SOURCE_MISSING");
    expect(() => buildHistory(previous, previousHistory, current, { csvRows: [...csvRows, csvRows[0]], reconcilePeriods: ["2026-04"] })).toThrow("38BIS_HISTORY_RECONCILE_COUNT_MISMATCH");
  });

  it("no confunde cambios de mayúsculas o tildes con entradas y salidas", () => {
    const previous = [{ partida: "Ministerio", organismo: "MINISTERIO", cargo: "ASESOR", nombre: "No reportado", bruto_mensual: null }];
    const current = [{ partida: "Ministerio", organismo: "MINISTERIO", cargo: "ASESOR", nombre: "NO REPORTADO", bruto_mensual: null }];
    expect(compareRows(previous, current)).toMatchObject({ entradas: 0, salidasObservadas: 0, cambios: 0 });
  });

  it("no cuenta como cambios salariales el primer agregado de etiquetas de origen a un baseline antiguo", () => {
    const previous = [{ partida: "Ministerio", organismo: "MINISTERIO", cargo: "MINISTRO", nombre: "DANIEL MAS", bruto_mensual: null }];
    const current = [{ ...previous[0], bruto_mensual_texto_fuente: "NO APLICA", bruto_mensual_estado_fuente: "no_aplica" }];
    expect(compareRows(previous, current)).toMatchObject({ entradas: 0, salidasObservadas: 0, cambios: 0 });
    const enriched = [{ ...current[0], bruto_mensual_texto_fuente: "NO REPORTADO", bruto_mensual_estado_fuente: "no_reportado" }];
    expect(compareRows(current, enriched)).toMatchObject({ entradas: 0, salidasObservadas: 0, cambios: 1 });
  });

  it("ignora la incorporación inicial de situación y cuenta cambios posteriores", () => {
    const previous = [{ partida: "Ministerio", organismo: "SUBSECRETARÍA", cargo: "ASESOR", nombre: "NO REPORTADO", bruto_mensual: null }];
    const enriched = [{ ...previous[0], situacion_fuente: "VACANTE: EL CARGO ESTÁ DESOCUPADO" }];
    expect(compareRows(previous, enriched)).toMatchObject({ entradas: 0, salidasObservadas: 0, cambios: 0 });
    const revised = [{ ...enriched[0], situacion_fuente: "CARGO PROVISTO" }];
    expect(compareRows(enriched, revised)).toMatchObject({ entradas: 0, salidasObservadas: 0, cambios: 1 });
  });
});

describe("guardas del candidato 38 bis", () => {
  it("no espera un despliegue inexistente tras no-op o verificación sin publicación", () => {
    const job = (conclusion: string) => [{ steps: [{ name: "Publicar snapshot, manifest y auditoría en R2", conclusion }] }];
    expect(shouldVerify38BisPublication(job("skipped"))).toBe(false);
    expect(shouldVerify38BisPublication(job("success"))).toBe(true);
    expect(() => shouldVerify38BisPublication([])).toThrow("MISSING");
    expect(() => shouldVerify38BisPublication(job("failure"))).toThrow("INVALID");
    const guard = readFileSync(new URL("../../.github/workflows/etl-publication-guard.yml", import.meta.url), "utf8");
    expect(guard).toContain("shouldVerify38BisPublication");
    const pages = readFileSync(new URL("../../.github/workflows/pages-static-refresh.yml", import.meta.url), "utf8");
    const ui = readFileSync(new URL("../../.github/workflows/pages-ui-refresh.yml", import.meta.url), "utf8");
    expect(pages).toContain("shouldVerify38BisPublication");
    expect(pages).toContain("node scripts/hydrate-remuneraciones-38bis.mjs");
    expect(ui).toContain("node scripts/hydrate-remuneraciones-38bis.mjs");
  });
  it("exige baseline R2, modo de verificación y preflight antes de escribir", () => {
    const workflow = readFileSync(new URL("../../.github/workflows/etl-remuneraciones-38bis.yml", import.meta.url), "utf8");
    expect(workflow).toContain("--require-published-baseline");
    expect(workflow).toContain("reconcile_history_periods:");
    expect(workflow).toContain("--reconcile-history-periods");
    expect(workflow).toContain('a.publication_status==="history_reconciled"');
    expect(workflow).toContain("m.history_key");
    const etl = readFileSync(new URL("../scripts/etl-remuneraciones-38bis.mjs", import.meta.url), "utf8");
    expect(etl).toContain('const publicationStatus = historyOnlyChange ? "history_reconciled" : candidate.status');
    expect(etl).not.toContain("38BIS_HISTORY_ONLY_CHANGE_REQUIRES_NEW_RELEASE");
    expect(workflow).toContain("verify_release_only:");
    expect(workflow).toContain("assertRemoteR2WriteBudget");
    expect(workflow).toContain("steps.extract.outputs.changed == 'true'");
    expect(workflow).not.toContain("se usará el historial versionado");
    expect(workflow).not.toContain("se creará una línea base");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("releases/${r.mes}/${r.checksum_sha256}");
  });
  const rows = Array.from({ length: 600 }, (_, index) => ({ partida: "Congreso Nacional", organismo: "SENADO", cargo: "SENADOR", nombre: `PERSONA ${index}`, bruto_mensual: index === 0 ? null : index === 1 ? 0 : 100 }));
  const release = (registros = rows, mes: string | null = "2026-07") => ({ schema_version: 2, url: "https://comision38bis.gob.cl/registro-publico", mes, registros, filas: registros.length, checksum_sha256: checksumRows(registros) });
  it("hidrata sólo snapshot, histórico y auditoría concordantes, nunca el fixture Git", () => {
    const current = release();
    const history = { schema_version: 1, source_id: "remuneraciones-38bis", periodos: [] };
    const audit = { source_id: "remuneraciones-38bis", mes: current.mes, filas: current.filas, checksum_sha256: current.checksum_sha256, d1_rows_read: 0, d1_rows_written: 0 };
    expect(validate38BisArtifacts(current, history, audit).rows).toBe(600);
    expect(() => validate38BisArtifacts(current, history, { ...audit, checksum_sha256: "0".repeat(64) })).toThrow("AUDIT");
    expect(() => validate38BisArtifacts(current, history, { ...audit, mes: "2026-06" })).toThrow("AUDIT");
  });
  it("rechaza período ausente o inválido sin inventar el mes de ejecución", () => {
    for (const month of [null, "2026-13"]) expect(() => validate38BisSnapshot(release(rows, month))).toThrow("PERIOD_INVALID");
  });
  it("rechaza una línea base corrupta antes de comparar", () => {
    expect(() => validate38BisSnapshot(release(), { previous: { ...release(), checksum_sha256: "0".repeat(64) } })).toThrow("CHECKSUM");
  });
  it("rechaza un corte de otro origen aunque sus filas tengan checksum válido", () => {
    expect(() => validate38BisSnapshot({ ...release(), url: "https://example.com" })).toThrow("SOURCE_INVALID");
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
  it("un mes nuevo no es no-op aunque publique las mismas filas", () => {
    expect(validate38BisSnapshot(release(rows, "2026-08"), { previous: release() }).status).toBe("valid_candidate");
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
