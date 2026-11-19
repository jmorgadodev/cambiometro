import { describe, expect, it } from "vitest";
import { buildExpenseSubset, buildExpensePeriodShards } from "./expense-release.mjs";
import { buildStaticInputManifest, sha256Buffer } from "./static-site-inputs.mjs";
import { prepareExpenseCandidate } from "./etl/expense-candidate.mjs";
import { planReviewedExpensePromotion, expenseReviewDigest } from "./promote-reviewed-expenses.mjs";

const now = "2026-11-18T21:00:00Z";
const sourceSha = "a".repeat(40);
const candidateSha256 = "b".repeat(64);
function fixture(sourceId = "gastos_camara") {
  const row = (id, amount = 100, period = "2026-08") => ({ id, ...(sourceId === "gastos_camara" ? { diputado_id: "1110" } : {}), nombre: "Persona Uno", periodo: period, item: "Telefonía", monto_clp: amount,
    url: sourceId === "gastos_camara" ? "https://www.camara.cl/diputados/detalle/gastosoperacionales.aspx?prmId=1110" : "https://web-back.senado.cl/api/transparency/expenses/senator-Operational-expenses" });
  const baseline = buildExpenseSubset({ sourceId, generatedAt: now, records: [row("historic", 90, "2026-07"), row("one")] });
  const index = { schemaVersion: 1, dataset: "gastos-operacionales-por-periodo", sources: [{ sourceId: "gastos_camara", periods: [] }, { sourceId: "gastos_senado", periods: [] }] };
  const entries = buildExpensePeriodShards(baseline).map(({ period, payload }) => {
    const bytes = Buffer.from(JSON.stringify(payload) + "\n");
    const checksumSha256 = sha256Buffer(bytes); const path = `data/lake-subsets/expense-periods/${sourceId}/${period}.json`;
    return { path, key: `projections/static-site-v1/releases/${checksumSha256}/${path}`, size: bytes.length, checksumSha256, sourceId, period, recordCount: payload.recordCount };
  });
  const manifest = buildStaticInputManifest({ entries, generatedAt: now });
  const make = (incoming = [row("one", 80)], periods = ["2026-08"]) => {
    const result = prepareExpenseCandidate({ baseline, incoming, scope: { sourceId, complete: true, periods }, generatedAt: now });
    const envelope = { schemaVersion: 1, sourceId, sourceSha, ...result };
    const approval = { schemaVersion: 1, candidateSha256, sourceSha, baselineChecksumSha256: baseline.checksumSha256, changeDigest: expenseReviewDigest(result.review), reviewedAt: now, reason: "Contraste independiente con la respuesta oficial y desglose mensual." };
    return { envelope, approval };
  };
  const plan = (changes = {}) => planReviewedExpensePromotion({ baseline, manifest, index, sourceSha, candidateSha256, now, ...make(), ...changes });
  return { baseline, manifest, index, row, make, plan };
}
describe.each(["gastos_camara", "gastos_senado"])("promoción revisada %s", sourceId => {
  it("publica sólo las revisiones exactas aprobadas, conservando el mes histórico", () => {
    const f = fixture(sourceId); const plan = f.plan();
    expect(plan.action).toBe("ready");
    expect(plan.payloads.filter(p => p.entry.period).map(p => p.entry.period)).toEqual(["2026-08"]);
    expect(plan.manifest.files.find(f => f.period === "2026-07")).toEqual(f.manifest.files.find(f => f.period === "2026-07"));
  });
  it("sin aprobación o con aprobación para otros bytes retiene el manifiesto", () => {
    const f = fixture(sourceId);
    expect(() => f.plan({ approval: undefined })).toThrow("EXPLICIT_REVIEW_REQUIRED");
    expect(() => f.plan({ candidateSha256: "c".repeat(64) })).toThrow("EXPLICIT_REVIEW_REQUIRED");
    expect(() => f.plan({ approval: { ...f.make().approval, changeDigest: "d".repeat(64) } })).toThrow("EXPLICIT_REVIEW_REQUIRED");
  });
  it("no acepta baseline desfasado ni cambios fuera del alcance aprobado", () => {
    const f = fixture(sourceId); const { envelope } = f.make();
    expect(() => f.plan({ envelope: { ...envelope, review: { ...envelope.review, baselineChecksumSha256: "f".repeat(64) } } })).toThrow("STALE_BASELINE");
    const candidate = buildExpenseSubset({ sourceId, generatedAt: now, records: [f.row("historic", 1, "2026-07"), f.row("one", 80)] });
    expect(() => f.plan({ envelope: { ...envelope, candidate } })).toThrow("OUTSIDE_SCOPE_CHANGED");
  });
  it("no acepta montos desconocidos ni autoridades retiradas aunque exista revisión", () => {
    const f = fixture(sourceId);
    expect(() => f.plan(f.make([f.row("one", null)]))).toThrow("UNVERIFIED_AMOUNTS");
    const row = { ...f.row("new", 80), nombre: "Otra Persona", ...(sourceId === "gastos_camara" ? { diputado_id: "1120", url: "https://www.camara.cl/diputados/detalle/gastosoperacionales.aspx?prmId=1120" } : {}) };
    expect(() => f.plan(f.make([row]))).toThrow("AUTHORITY_MONTH_REMOVED");
  });
  it("no renueva el manifiesto cuando no cambia ningún registro", () => {
    const f = fixture(sourceId);
    expect(f.plan({ ...f.make([f.row("one")]), approval: undefined }).action).toBe("unchanged");
  });
  it("un nuevo mes válido no necesita aprobar una revisión histórica", () => {
    const f = fixture(sourceId);
    expect(f.plan({ ...f.make([f.row("new", 80, "2026-09")], ["2026-09"]), approval: undefined }).action).toBe("ready");
  });
  it("rechaza observaciones y revisiones vencidas", () => {
    const f = fixture(sourceId);
    expect(() => f.plan({ now: "2026-11-20T22:00:00Z" })).toThrow("OBSERVATION_EXPIRED");
    expect(() => f.plan({ approval: { ...f.make().approval, reviewedAt: "2026-11-16T00:00:00Z" } })).toThrow("APPROVAL_EXPIRED");
  });
});
