import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertExpenseSubsetIntegrity, buildExpenseSubset, buildExpensePeriodShards, sanitizeExpenseSubsetForPublication } from "./expense-release.mjs";
import { loadCanonicalExpenseBaseline } from "./etl/canonical-expense-baseline.mjs";
import { auditExpenseGroups } from "./etl/expense-candidate.mjs";
import { createR2ManifestClient, readConditionalManifest, putConditionalManifest } from "./etl/r2-conditional-manifest.mjs";
import { assertRemoteR2WriteBudget, configuredR2BudgetBuckets } from "./etl/r2-account-budget.mjs";
import { requireCloudflareDataCredentials } from "./etl/ci-env.mjs";
import { buildStaticInputManifest, sha256Buffer } from "./static-site-inputs.mjs";
import { buildReleaseSet } from "./release-set.mjs";

const indexPath = "data/lake-subsets/expense-periods/manifest.json";
const subsetPath = "data/lake-subsets/gastos-camara.subset.json";
const encode = payload => Buffer.from(JSON.stringify(payload) + "\n");

export function planCamaraCandidatePromotion({ baseline, envelope, manifest, index, sourceSha, now = new Date().toISOString() }) {
  buildReleaseSet(manifest);
  if (envelope?.schemaVersion !== 1 || envelope.sourceId !== "gastos_camara" || envelope.sourceSha !== sourceSha || !/^[a-f0-9]{40}$/.test(sourceSha ?? "")) throw new Error("CAMARA_PROMOTION_SOURCE_INVALID");
  if (!["prepared", "unchanged"].includes(envelope.review?.status)) throw new Error("CAMARA_PROMOTION_REVIEW_REQUIRED");
  const age = Date.parse(now) - Date.parse(envelope.review.generatedAt);
  if (!Number.isFinite(age) || age < -600_000 || age > 86_400_000) throw new Error("CAMARA_PROMOTION_OBSERVATION_EXPIRED");
  const previous = assertExpenseSubsetIntegrity(baseline);
  const candidate = envelope.candidate;
  const records = assertExpenseSubsetIntegrity(candidate);
  if (candidate.generatedAt !== envelope.review.generatedAt) throw new Error("CAMARA_PROMOTION_TIMESTAMP_MISMATCH");
  if (baseline.sourceId !== "gastos_camara" || candidate.sourceId !== "gastos_camara") throw new Error("CAMARA_PROMOTION_SOURCE_INVALID");
  const byId = new Map(records.map(row => [row.id, row]));
  for (const row of previous) {
    const after = byId.get(row.id);
    if (!after || ["periodo", "diputado_id", "item", "monto_clp", "nombre", "fecha", "url", "fuente"].some(key => after[key] !== row[key])) throw new Error(`CAMARA_PROMOTION_PUBLISHED_ROW_CHANGED:${row.id}`);
  }
  const previousIds = new Set(previous.map(row => row.id));
  if (records.some(row => baseline.periods.includes(row.periodo) && !previousIds.has(row.id))) throw new Error("CAMARA_PROMOTION_EXISTING_PERIOD_CHANGED");
  for (const row of records) {
    const url = new URL(row.url);
    if (url.protocol !== "https:" || !(url.hostname === "camara.cl" || url.hostname.endsWith(".camara.cl")) || url.searchParams.get("prmId") !== row.diputado_id) throw new Error("CAMARA_PROMOTION_URL_INVALID");
  }
  const newPeriods = candidate.periods.filter(period => !baseline.periods.includes(period));
  if (!newPeriods.length) return { action: "unchanged", entries: [], payloads: [], manifest, newPeriods };
  if (newPeriods.some(period => period < baseline.periods.at(-1))) throw new Error("CAMARA_PROMOTION_HISTORIC_REVIEW_REQUIRED");
  const latestDateCandidate = buildExpenseSubset({ sourceId: "gastos_camara", records, generatedAt: now });
  if (sanitizeExpenseSubsetForPublication(latestDateCandidate).excludedPeriods.length) throw new Error("CAMARA_PROMOTION_UNVERIFIED_PERIOD");
  const expectedIds = new Set(previous.map(row => row.diputado_id));
  for (const period of newPeriods) {
    const rows = records.filter(row => row.periodo === period);
    const identities = new Set(rows.map(row => row.diputado_id));
    if (identities.size !== expectedIds.size || [...expectedIds].some(id => !identities.has(id)) || auditExpenseGroups(rows, "gastos_camara").some(group => group.issues.length)) throw new Error(`CAMARA_PROMOTION_COVERAGE_INVALID:${period}`);
  }
  if (index?.schemaVersion !== 1 || index.dataset !== "gastos-operacionales-por-periodo" || !Array.isArray(index.sources)
    || index.sources.length !== 2 || new Set(index.sources.map(source => source.sourceId)).size !== 2
    || !index.sources.some(source => source.sourceId === "gastos_camara") || !index.sources.some(source => source.sourceId === "gastos_senado")) throw new Error("CAMARA_PROMOTION_INDEX_INVALID");
  const files = new Map(manifest.files.map(file => [file.path, file]));
  const payloads = [];
  function stage(path, payload, metadata = {}) {
    const bytes = encode(payload);
    const checksumSha256 = sha256Buffer(bytes);
    const entry = { path, key: `projections/static-site-v1/releases/${checksumSha256}/${path}`, size: bytes.length, checksumSha256, ...metadata };
    if (files.get(path)?.checksumSha256 === checksumSha256 && files.get(path)?.size === bytes.length) return;
    files.set(path, entry);
    payloads.push({ entry, bytes });
  }
  stage(subsetPath, candidate);
  const shards = buildExpensePeriodShards(candidate);
  for (const { period, payload } of shards) stage(`data/lake-subsets/expense-periods/gastos_camara/${period}.json`, payload, { sourceId: "gastos_camara", period, recordCount: payload.recordCount });
  stage(indexPath, { ...index, generatedAt: now, sources: index.sources.map(source => ({ ...source, periods: source.sourceId === "gastos_camara"
    ? shards.map(({ period, payload }) => ({ period, path: `data/lake-subsets/expense-periods/gastos_camara/${period}.json`, recordCount: payload.recordCount }))
    : manifest.files.filter(file => file.sourceId === source.sourceId && file.path === `data/lake-subsets/expense-periods/${source.sourceId}/${file.period}.json`).map(file => ({ period: file.period, path: file.path, recordCount: file.recordCount })).sort((a, b) => a.period.localeCompare(b.period)) })) });
  const next = buildStaticInputManifest({ entries: [...files.values()], generatedAt: now });
  buildReleaseSet(next);
  return { action: "ready", manifest: next, payloads, entries: payloads.map(item => item.entry), newPeriods };
}

export async function main() {
  if (process.env.GITHUB_ACTIONS !== "true") throw new Error("CAMARA_PROMOTION_CI_ONLY");
  const checksum = process.env.CAMARA_CANDIDATE_SHA256;
  const sourceSha = process.env.CAMARA_SOURCE_SHA;
  if (!/^[a-f0-9]{64}$/.test(checksum ?? "") || !/^[a-f0-9]{40}$/.test(sourceSha ?? "")) throw new Error("CAMARA_PROMOTION_REFERENCE_INVALID");
  const credentials = requireCloudflareDataCredentials();
  const client = await createR2ManifestClient(credentials);
  const bucket = "transparencia-public-data";
  const manifestUrl = client.url(bucket, "projections/static-site-v1/manifest.json");
  const current = await readConditionalManifest({ url: manifestUrl, fetchImpl: client.fetch });
  buildReleaseSet(current.manifest);
  async function readObject(file) {
    const response = await client.fetch(client.url(bucket, file.key), { headers: { "Accept-Encoding": "identity" } });
    if (!response.ok) throw new Error(`CAMARA_PROMOTION_READ_${response.status}`);
    const length = Number(response.headers.get("content-length"));
    if (length > 64 * 1024 * 1024) throw new Error("CAMARA_PROMOTION_INPUT_TOO_LARGE");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 64 * 1024 * 1024 || sha256Buffer(bytes) !== file.checksumSha256 || (file.size !== undefined && bytes.length !== file.size)) throw new Error("CAMARA_PROMOTION_CHECKSUM_MISMATCH");
    return bytes;
  }
  const body = await readObject({ key: `projections/staging/camara-expense-candidates/${checksum}.json`, checksumSha256: checksum });
  const baseline = await loadCanonicalExpenseBaseline(current.manifest, "gastos_camara", readObject);
  const indexEntry = current.manifest.files.find(file => file.path === indexPath);
  if (!indexEntry) throw new Error("CAMARA_PROMOTION_INDEX_REQUIRED");
  const index = JSON.parse((await readObject(indexEntry)).toString("utf8"));
  const plan = planCamaraCandidatePromotion({ baseline, envelope: JSON.parse(body.toString("utf8")), manifest: current.manifest, index, sourceSha });
  const output = resolve(".ci-data-version/gastos-camara");
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, "manifest-before.json"), current.body);
  const report = { action: plan.action, sourceSha, candidateSha256: checksum, newPeriods: plan.newPeriods, previousManifestChecksum: current.manifest.checksumSha256, manifestChecksum: plan.manifest.checksumSha256, releaseSetId: buildReleaseSet(plan.manifest).releaseSetId };
  if (plan.action === "ready") {
    const manifestBody = JSON.stringify(plan.manifest, null, 2) + "\n";
    await assertRemoteR2WriteBudget({ ...credentials, buckets: configuredR2BudgetBuckets(bucket), puts: [...plan.entries.map(entry => ({ bucket, key: entry.key, size: entry.size })), { bucket, key: "projections/static-site-v1/manifest.json", size: Buffer.byteLength(manifestBody) }] });
    for (const { entry, bytes } of plan.payloads) {
      const response = await client.fetch(client.url(bucket, entry.key), { method: "PUT", headers: { "If-None-Match": "*", "Content-Type": "application/json" }, body: bytes });
      if (!response.ok && response.status !== 412) throw new Error(`CAMARA_PROMOTION_WRITE_${response.status}`);
      await readObject(entry);
    }
    await putConditionalManifest({ url: manifestUrl, etag: current.etag, body: manifestBody, fetchImpl: client.fetch });
    const published = await readConditionalManifest({ url: manifestUrl, fetchImpl: client.fetch });
    if (published.manifest.checksumSha256 !== plan.manifest.checksumSha256) throw new Error("CAMARA_PROMOTION_READBACK_MISMATCH");
    report.action = "published";
  }
  writeFileSync(resolve(output, "receipt.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
