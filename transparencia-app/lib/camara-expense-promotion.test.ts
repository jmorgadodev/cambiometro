import { describe, expect, it } from "vitest";
import { buildExpenseSubset, buildExpensePeriodShards } from "../scripts/expense-release.mjs";
import { buildStaticInputManifest, sha256Buffer } from "../scripts/static-site-inputs.mjs";
import { loadCanonicalExpenseBaseline } from "../scripts/etl/canonical-expense-baseline.mjs";
import { planCamaraCandidatePromotion } from "../scripts/promote-camara-expense-candidate.mjs";

const now = "2026-11-18T12:00:00Z";
const sourceSha = "a".repeat(40);
const row = (id: string, period = "2026-08", amount: number | null = 100, deputy = "1009") => ({ id, diputado_id: deputy, nombre: deputy, periodo: period, fecha: `${period}-01`, item: "Telefonía", monto_clp: amount, url: `https://www.camara.cl/diputados/detalle/gastosoperacionales.aspx?prmId=${deputy}` });
type FixtureExpense = { id: string; periodo: string; item: string; monto_clp: number | null; url: string; diputado_id?: string; nombre?: string; fecha?: string; fuente?: string };
const subset = (records: FixtureExpense[]) => buildExpenseSubset({ sourceId: "gastos_camara", records, generatedAt: now });

function fixture() {
  const baseline = subset([row("one"), row("two", "2026-08", 200, "1110")]);
  const index = { schemaVersion: 1, dataset: "gastos-operacionales-por-periodo", sources: [
    { sourceId: "gastos_camara", periods: [{ period: "2026-08", path: "data/lake-subsets/expense-periods/gastos_camara/2026-08.json", recordCount: 2 }] },
    { sourceId: "gastos_senado", periods: [{ period: "2026-08", path: "data/lake-subsets/expense-periods/gastos_senado/2026-08.json", recordCount: 1 }] },
  ] };
  const objects = new Map<string, Buffer>();
  const monthly = buildExpensePeriodShards(baseline)[0].payload;
  const entries = [
    { path: "data/lake-subsets/expense-periods/gastos_camara/2026-08.json", payload: monthly, sourceId: "gastos_camara", period: "2026-08", recordCount: 2 },
    { path: "data/lake-subsets/expense-periods/gastos_senado/2026-08.json", payload: { sourceId: "gastos_senado", period: "2026-08", recordCount: 1, records: [] }, sourceId: "gastos_senado", period: "2026-08", recordCount: 1 },
    { path: "data/lake-subsets/expense-periods/manifest.json", payload: index },
    { path: "data/personal-apoyo.json", payload: { untouched: true } },
  ].map(({ payload, ...metadata }) => {
    const bytes = Buffer.from(JSON.stringify(payload) + "\n");
    const checksumSha256 = sha256Buffer(bytes);
    const key = `projections/static-site-v1/releases/${checksumSha256}/${metadata.path}`;
    objects.set(key, bytes);
    return { ...metadata, key, checksumSha256, size: bytes.length };
  });
  const manifest = buildStaticInputManifest({ entries, generatedAt: now });
  const envelope = (candidate = baseline) => ({ schemaVersion: 1, sourceId: "gastos_camara", sourceSha, candidate, review: { status: "prepared", generatedAt: now } });
  return { baseline, manifest, index, objects, envelope };
}

describe("baseline mensual canónico de gastos", () => {
  it("recupera meses de los shards sin depender del subset histórico retenido", async () => {
    const f = fixture();
    const result = await loadCanonicalExpenseBaseline(f.manifest, "gastos_camara", async (file: { key: string }) => f.objects.get(file.key)!);
    expect(result.records).toEqual(f.baseline.records);
    expect(result.periods).toEqual(["2026-08"]);
  });
  it("rechaza una descarga alterada y no reemplaza el release por una copia de Git", async () => {
    const f = fixture();
    await expect(loadCanonicalExpenseBaseline(f.manifest, "gastos_camara", async () => Buffer.from("{}"))).rejects.toThrow("CHECKSUM_MISMATCH");
    await expect(loadCanonicalExpenseBaseline(buildStaticInputManifest({ entries: f.manifest.files.filter(file => file.sourceId !== "gastos_camara"), generatedAt: now }), "gastos_camara", async () => Buffer.from("{}"))).rejects.toThrow("CANONICAL_BASELINE_MISSING");
  });
});

describe("promoción Cámara en CI", () => {
  it("no escribe un manifiesto si el candidato ya está publicado", () => {
    const f = fixture();
    const result = planCamaraCandidatePromotion({ ...f, envelope: f.envelope(), sourceSha, now });
    expect(result.action).toBe("unchanged");
    expect(result.payloads).toEqual([]);
    expect(result.manifest).toBe(f.manifest);
  });
  it("añade un mes completo preservando Senado y los otros dominios", () => {
    const f = fixture();
    const candidate = subset([...f.baseline.records, row("new-one", "2026-09"), row("new-two", "2026-09", 150, "1110")]);
    const result = planCamaraCandidatePromotion({ ...f, envelope: f.envelope(candidate), sourceSha, now });
    expect(result.action).toBe("ready");
    expect(result.newPeriods).toEqual(["2026-09"]);
    for (const file of f.manifest.files.filter(file => file.sourceId === "gastos_senado" || file.path === "data/personal-apoyo.json")) expect(result.manifest.files.find((next: { path: string }) => next.path === file.path)).toEqual(file);
    expect(result.entries.some(file => file.sourceId === "gastos_senado")).toBe(false);
  });
  it("bloquea una pérdida de IDs o una modificación de importes aunque aumente la cantidad de filas", () => {
    const f = fixture();
    const candidates = [subset([f.baseline.records[0], row("replacement", "2026-08", 200, "1110"), row("new-one", "2026-09")]), subset([row("one", "2026-08", 101), f.baseline.records[1], row("new-one", "2026-09")])];
    for (const candidate of candidates) expect(() => planCamaraCandidatePromotion({ ...f, envelope: f.envelope(candidate), sourceSha, now })).toThrow("PUBLISHED_ROW_CHANGED");
  });
  it("rechaza meses incompletos, futuros, montos desconocidos y observaciones vencidas", () => {
    const f = fixture();
    const plan = (candidate: ReturnType<typeof subset>) => planCamaraCandidatePromotion({ ...f, envelope: f.envelope(candidate), sourceSha, now });
    expect(() => plan(subset([...f.baseline.records, row("only-one", "2026-09")]))).toThrow("COVERAGE_INVALID");
    expect(() => plan(subset([...f.baseline.records, row("future", "2026-11")]))).toThrow("UNVERIFIED_PERIOD");
    expect(() => plan(subset([...f.baseline.records, row("new-one", "2026-09", null), row("new-two", "2026-09", 1, "1110")]))).toThrow("COVERAGE_INVALID");
    expect(() => planCamaraCandidatePromotion({ ...f, envelope: { ...f.envelope(), review: { status: "prepared", generatedAt: "2026-11-01T00:00:00Z" } }, sourceSha, now })).toThrow("OBSERVATION_EXPIRED");
  });
});
