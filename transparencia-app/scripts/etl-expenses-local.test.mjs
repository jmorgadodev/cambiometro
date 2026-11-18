import { describe, expect, it } from "vitest";
import { camaraExpenseCandidateScope, chileExpenseSchedule, expenseLocalExecutionMode, expenseRuntimeEnvironment, camaraExpensePromotionDispatchArgs, camaraIncrementalPeriods } from "./etl-expenses-local.mjs";
import { buildExpenseSubset } from "./expense-release.mjs";
import { auditExpenseGroups, prepareExpenseCandidate, planCamaraExpensePublication } from "./etl/expense-candidate.mjs";
import { expenseCandidateDirectory, prepareExpenseCandidateFiles } from "./prepare-expense-candidate.mjs";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRow = (id, period = "2026-08", amount = 100, extra = {}) => ({ id, diputado_id: "1009", nombre: "Referencia de prueba", periodo: period, fecha: `${period}-01`, item: id, monto_clp: amount, url: "https://www.camara.cl/transparencia/", fuente: "fixture", ...extra });
const fixtureSubset = records => buildExpenseSubset({ sourceId: "gastos_camara", records, generatedAt: "2026-11-18T00:00:00Z" });
const scope = { sourceId: "gastos_camara", periods: ["2026-08"], complete: true };

describe("runner local de gastos operacionales", () => {
  it("conserva la credencial de datos inyectada por Actions para hidratar sin exigir OAuth local", () => {
    const environment = { GITHUB_ACTIONS: "true", CLOUDFLARE_ACCOUNT_ID: "fixture-account", CLOUDFLARE_API_TOKEN: "ci-data-token" };
    expect(expenseRuntimeEnvironment(environment, null, { hydrateOnly: true }).CLOUDFLARE_API_TOKEN).toBe("ci-data-token");
    expect(() => expenseRuntimeEnvironment(environment, null)).toThrow("REAUTH_REQUIRED");
  });
  it("prefiere la credencial de datos o la sesión OAuth existente al token genérico del entorno", () => {
    const environment = { CLOUDFLARE_ACCOUNT_ID: "fixture-account", CLOUDFLARE_API_TOKEN: "unrelated-token" };
    expect(expenseRuntimeEnvironment(environment, { type: "oauth", token: "existing-session" }).CLOUDFLARE_API_TOKEN).toBe("existing-session");
    expect(environment.CLOUDFLARE_API_TOKEN).toBe("unrelated-token");
    expect(expenseRuntimeEnvironment({ ...environment, CLOUDFLARE_DATA_API_TOKEN: "data-token" }, null).CLOUDFLARE_API_TOKEN).toBe("data-token");
    expect(() => expenseRuntimeEnvironment(environment, null)).toThrow("REAUTH_REQUIRED");
  });
  it("separa preparación de publicación y exige un directorio nuevo de artifacts", () => {
    expect(expenseLocalExecutionMode(["--prepare-only", "--candidate-dir", "artifacts/expense-candidates/mode-test"])).toMatchObject({ prepareOnly: true });
    expect(expenseLocalExecutionMode(["--force"])).toEqual({ prepareOnly: false, candidateDirectory: null, useWranglerSession: false, periods: undefined });
    expect(() => expenseLocalExecutionMode(["--prepare-only", "--hydrate-only"])).toThrow("PREPARE_MODE_CONFLICT");
    expect(() => expenseLocalExecutionMode(["--candidate-dir", "artifacts/expense-candidates/test"])).toThrow("PREPARE_MODE_REQUIRED");
    expect(() => expenseLocalExecutionMode(["--prepare-only", "--publish"])).toThrow("ARGUMENTS_INVALID");
    expect(() => expenseCandidateDirectory("data/lake-subsets")).toThrow("OUTPUT_OUTSIDE_ARTIFACTS");
    expect(() => expenseLocalExecutionMode(["--use-wrangler-session"])).toThrow("PREPARE_MODE_REQUIRED");
    expect(() => expenseLocalExecutionMode(["--prepare-only", "--periods", "2026-13"])).toThrow("PERIODS_INVALID");
    expect(expenseLocalExecutionMode(["--prepare-only", "--candidate-dir", "artifacts/expense-candidates/scoped-test", "--use-wrangler-session", "--periods", "2026-08,2026-09"])).toMatchObject({ useWranglerSession: true, periods: ["2026-08", "2026-09"] });
  });
  it("ejecuta el día 2 usando la zona horaria de Chile", () => {
    const schedule = chileExpenseSchedule(new Date("2026-08-02T03:30:00.000Z"));
    expect(schedule.date).toBe("2026-08-01");
    expect(schedule.shouldRun).toBe(false);

    const second = chileExpenseSchedule(new Date("2026-08-02T04:30:00.000Z"));
    expect(second.date).toBe("2026-08-02");
    expect(second.shouldRun).toBe(true);
  });

  it("reintenta publicaciones tardías en días 12 y 22 y limita la extracción a meses elegibles", () => {
    for (const day of [2, 12, 22]) expect(chileExpenseSchedule(new Date(`2026-11-${String(day).padStart(2, "0")}T12:00:00Z`)).shouldRun).toBe(true);
    expect(chileExpenseSchedule(new Date("2026-11-18T12:00:00Z")).shouldRun).toBe(false);
    expect(camaraIncrementalPeriods(new Date("2026-11-18T12:00:00Z"))).toEqual(["2026-08", "2026-09"]);
    expect(camaraIncrementalPeriods(new Date("2027-03-02T12:00:00Z"))).toEqual(["2027-01"]);
  });
  it("sólo despacha referencias inmutables al workflow de datos y no una publicación desde el checkout", () => {
    expect(camaraExpensePromotionDispatchArgs("a".repeat(64), "b".repeat(40))).toEqual(["workflow", "run", "etl-expenses.yml", "--ref", "main", "-f", `camara_candidate_sha256=${"a".repeat(64)}`, "-f", `camara_source_sha=${"b".repeat(40)}`]);
    expect(() => camaraExpensePromotionDispatchArgs("../invalid", "b".repeat(40))).toThrow("REFERENCE_INVALID");
  });
});

describe("candidatos locales de gastos", () => {
  const zeroMatrix = period => Array.from({ length: 20 }, (_, deputy) => Array.from({ length: 10 }, (_, item) => fixtureRow(`${period}-${deputy}-${item}`, period, 0, { diputado_id: String(1009 + deputy), item: `Categoría ${item}` }))).flat();
  it("evita republicar por una matriz de ceros nueva o por un mes futuro", () => {
    const baseline = fixtureSubset([fixtureRow("published")]);
    const result = planCamaraExpensePublication({ baseline, incoming: [fixtureRow("published"), ...zeroMatrix("2026-09"), fixtureRow("future", "2026-11", 10)], generatedAt: "2026-11-18T00:00:00Z" });
    expect(result.shouldPublish).toBe(false);
    expect(result.review.status).toBe("unchanged");
    expect(result.candidate.periods).toEqual(["2026-08"]);
    expect(result.review.excludedPeriods.map(row => row.period)).toEqual(["2026-09", "2026-11"]);
  });
  it("retiene el release si un mes publicado se vuelve no verificable aunque llegue otro mes válido", () => {
    const baseline = fixtureSubset([fixtureRow("published")]);
    const result = planCamaraExpensePublication({ baseline, incoming: [...zeroMatrix("2026-08"), fixtureRow("new", "2026-09", 10)], generatedAt: "2026-11-18T00:00:00Z" });
    expect(result.shouldPublish).toBe(false);
    expect(result.candidate).toBe(baseline);
    expect(result.review.reasons).toContain("published-period-became-unverified");
  });
  it("permite continuar la publicación sólo con un período nuevo verificado, conservando los anteriores", () => {
    const baseline = fixtureSubset([fixtureRow("published")]);
    const result = planCamaraExpensePublication({ baseline, incoming: [fixtureRow("new", "2026-09", 10)], generatedAt: "2026-11-18T00:00:00Z" });
    expect(result.shouldPublish).toBe(true);
    expect(result.candidate.periods).toEqual(["2026-08", "2026-09"]);
  });
  it("retiene para revisión una matriz completa de ceros y no la presenta como gasto mensual confirmado", () => {
    const baseline = fixtureSubset([fixtureRow("published")]);
    const incoming = Array.from({ length: 20 }, (_, deputy) => Array.from({ length: 10 }, (_, item) => fixtureRow(`${deputy}-${item}`, "2026-09", 0, { diputado_id: String(1009 + deputy), item: `Categoría ${item}` }))).flat();
    const result = prepareExpenseCandidate({ baseline, incoming, scope: { ...scope, periods: ["2026-09"] } });
    expect(result.review.status).toBe("requires-review");
    expect(result.review.unverifiedZeroPeriods).toEqual(["2026-09"]);
    expect(result.review.groups.every(group => group.observedTotal === null)).toBe(true);
    expect(result.candidate.records.some(row => row.id === "published")).toBe(true);
  });
  it("detecta revisiones de categorías aunque la fuente regenere IDs y conserve el total mensual", () => {
    const baseline = fixtureSubset([fixtureRow("old-a", "2026-08", 100, { item: "Telefonía" }), fixtureRow("old-b", "2026-08", 100, { item: "Traslado" })]);
    const incoming = [fixtureRow("new-a", "2026-08", 90, { item: "Telefonía" }), fixtureRow("new-b", "2026-08", 110, { item: "Traslado" }), fixtureRow("summary", "2026-08", 200, { item: "VALOR TOTAL" })];
    const result = prepareExpenseCandidate({ baseline, incoming, scope });
    expect(result.review.monthlyChanges).toHaveLength(1);
    expect(result.review.monthlyChanges[0]).toMatchObject({ beforeTotal: 200, afterTotal: 200 });
    expect(result.review.monthlyChanges[0].itemChanges).toHaveLength(2);
    expect(result.review.reasons).toContain("published-monthly-items-revised");
  });
  it("conserva meses previos en un refresco incremental declarado", () => {
    const baseline = fixtureSubset([fixtureRow("march", "2026-03"), fixtureRow("august")]);
    const incoming = [fixtureRow("september", "2026-09")];
    const declaredScope = camaraExpenseCandidateScope(baseline, incoming, [{ id: "1009" }], ["2026-09"]);
    const result = prepareExpenseCandidate({ baseline, incoming, scope: declaredScope });
    expect(result.candidate.periods).toEqual(["2026-03", "2026-08", "2026-09"]);
    expect(result.review.removedIds).toEqual([]);
  });
  it("detecta un mes entero ausente del refresco y no incorpora años históricos al alcance", () => {
    const baseline = fixtureSubset([fixtureRow("past", "2025-08"), fixtureRow("july", "2026-07"), fixtureRow("august")]);
    const incoming = [fixtureRow("august")];
    const declaredScope = camaraExpenseCandidateScope(baseline, incoming, [{ id: "1009" }, { id: "1010" }]);
    expect(declaredScope.periods).toEqual(["2026-07", "2026-08"]);
    const result = prepareExpenseCandidate({ baseline, incoming, scope: declaredScope });
    expect(result.review.removedIds).toEqual(["july"]);
    expect(result.review.missingGroups).toContainEqual({ identity: "1009", period: "2026-07" });
    expect(result.review.missingGroups).toContainEqual({ identity: "1010", period: "2026-08" });
    expect(result.review.reasons).toContain("declared-authority-period-without-records");
    expect(result.candidate.records.some(row => row.id === "past")).toBe(true);
  });
  it("conserva los meses fuera del alcance y no cuenta la fila TOTAL dos veces", () => {
    const previous = fixtureSubset([fixtureRow("july", "2026-07"), fixtureRow("august-item", "2026-08", 100)]);
    const original = JSON.stringify(previous);
    const incoming = [fixtureRow("august-item", "2026-08", 100), fixtureRow("total", "2026-08", 100, { item: "VALOR TOTAL" })];
    const result = prepareExpenseCandidate({ baseline: previous, incoming, scope });
    expect(result.review.status).toBe("prepared");
    expect(result.review.automaticPublication).toBe(false);
    expect(result.review.preservedOutsideScope).toBe(1);
    expect(result.review.groups[0]).toMatchObject({ knownItemsTotal: 100, sourceTotal: 100, observedTotal: 100, itemRecords: 1 });
    expect(result.candidate.periods).toEqual(["2026-07", "2026-08"]);
    expect(JSON.stringify(previous)).toBe(original);
  });
  it("detecta pérdida de ítems aunque aumente el número total de filas", () => {
    const previous = fixtureSubset([fixtureRow("old-1"), fixtureRow("old-2")]);
    const result = prepareExpenseCandidate({ baseline: previous, incoming: [fixtureRow("old-1"), fixtureRow("new-1"), fixtureRow("new-2")], scope });
    expect(result.review.status).toBe("requires-review");
    expect(result.review.removedIds).toEqual(["old-2"]);
    expect(result.review.candidateRecords).toBeGreaterThan(result.review.previousRecords);
  });
  it("no sustituye el alcance de otra autoridad cuando sólo se consulta una", () => {
    const previous = fixtureSubset([fixtureRow("one"), fixtureRow("other", "2026-08", 200, { diputado_id: "1010" })]);
    const result = prepareExpenseCandidate({ baseline: previous, incoming: [fixtureRow("one")], scope: { ...scope, identities: ["1009"] } });
    expect(result.candidate.recordCount).toBe(2);
    expect(result.review.removedIds).toEqual([]);
    expect(result.review.preservedOutsideScope).toBe(1);
  });
  it("distingue cero publicado, monto ausente y discrepancia con el total de origen", () => {
    expect(auditExpenseGroups([fixtureRow("zero", "2026-08", 0)], "gastos_camara")[0]).toMatchObject({ observedTotal: 0, unknownAmounts: 0 });
    expect(auditExpenseGroups([fixtureRow("missing", "2026-08", null)], "gastos_camara")[0]).toMatchObject({ observedTotal: null, unknownAmounts: 1 });
    expect(auditExpenseGroups([fixtureRow("item", "2026-08", 90), fixtureRow("total", "2026-08", 100, { item: "TOTAL" })], "gastos_camara")[0].issues).toContain("source-total-differs-from-items");
    expect(auditExpenseGroups([fixtureRow("item", "2026-08", 100), fixtureRow("total", "2026-08", null, { item: "TOTAL" })], "gastos_camara")[0]).toMatchObject({ observedTotal: 100, sourceTotal: null, unknownItemAmounts: 0 });
  });
  it("mantiene ajustes negativos de Senado sin convertirlos en cargos positivos", () => {
    const rows = [fixtureRow("sen-1", "2026-08", 100, { url: "https://www.senado.cl/transparencia/" }), fixtureRow("sen-2", "2026-08", -20, { url: "https://www.senado.cl/transparencia/" })];
    const baseline = buildExpenseSubset({ sourceId: "gastos_senado", records: rows });
    const result = prepareExpenseCandidate({ baseline, incoming: rows, scope: { ...scope, sourceId: "gastos_senado" } });
    expect(result.review.groups[0].observedTotal).toBe(80);
    expect(result.review.identityKind).toBe("published-name-not-identity-reconciliation");
  });
  it("rechaza baseline manipulado, alcance incompleto, filas ajenas y reasignación de ID", () => {
    const baseline = fixtureSubset([fixtureRow("one")]);
    expect(() => prepareExpenseCandidate({ baseline: { ...baseline, checksumSha256: "0".repeat(64) }, incoming: [fixtureRow("one")], scope })).toThrow("CHECKSUM_MISMATCH");
    expect(() => prepareExpenseCandidate({ baseline, incoming: [fixtureRow("one")], scope: { ...scope, complete: false } })).toThrow("SCOPE_INVALID");
    expect(() => prepareExpenseCandidate({ baseline, incoming: [fixtureRow("new", "2026-09")], scope })).toThrow("ROW_OUTSIDE_SCOPE");
    expect(() => prepareExpenseCandidate({ baseline, incoming: [fixtureRow("one", "2026-08", 100, { diputado_id: "1010" })], scope })).toThrow("ID_REASSIGNED");
    expect(() => prepareExpenseCandidate({ baseline, incoming: [fixtureRow("one", "2026-08", 100, { url: "https://ejemplo.test/fila" })], scope })).toThrow("SOURCE_URL_INVALID");
  });
  it("registra revisiones de importe, incluso la diferencia entre ausente y cero", () => {
    const baseline = fixtureSubset([fixtureRow("one", "2026-08", null)]);
    const result = prepareExpenseCandidate({ baseline, incoming: [fixtureRow("one", "2026-08", 0)], scope });
    expect(result.review.status).toBe("requires-review");
    expect(result.review.amountChanges).toEqual([{ id: "one", before: null, after: 0 }]);
  });
  it("prepara desde archivos sin alterar el baseline ni sobrescribir otra ejecución", () => {
    const artifactRoot = join(workspace, "artifacts");
    mkdirSync(artifactRoot, { recursive: true });
    const work = mkdtempSync(join(artifactRoot, "expense-file-test-"));
    const label = work.split(/[\\/]/).at(-1);
    const output = join(artifactRoot, "expense-candidates", label);
    try {
      const baselineFile = join(work, "baseline.json");
      const incomingFile = join(work, "incoming.json");
      const scopeFile = join(work, "scope.json");
      const before = JSON.stringify(fixtureSubset([fixtureRow("one")]));
      writeFileSync(baselineFile, before);
      writeFileSync(incomingFile, JSON.stringify([fixtureRow("one")]));
      writeFileSync(scopeFile, JSON.stringify(scope));
      const result = prepareExpenseCandidateFiles({ baselineFile, incomingFile, scopeFile, outputDirectory: output });
      expect(result.review.status).toBe("prepared");
      expect(existsSync(join(output, "candidate.subset.json"))).toBe(true);
      expect(JSON.parse(readFileSync(join(output, "review.json"), "utf8")).automaticPublication).toBe(false);
      expect(readFileSync(baselineFile, "utf8")).toBe(before);
      expect(() => prepareExpenseCandidateFiles({ baselineFile, incomingFile, scopeFile, outputDirectory: output })).toThrow("OUTPUT_EXISTS");
    } finally {
      for (const path of [work, output]) {
        if (!resolve(path).startsWith(resolve(artifactRoot) + (process.platform === "win32" ? "\\" : "/"))) throw new Error("Fixture path fuera de artifacts");
        rmSync(path, { recursive: true, force: true });
      }
    }
  });
});
