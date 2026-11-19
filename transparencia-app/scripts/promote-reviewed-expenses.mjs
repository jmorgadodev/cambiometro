import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertExpenseSubsetIntegrity, buildExpensePeriodShards, sanitizeExpenseSubsetForPublication } from "./expense-release.mjs";
import { prepareExpenseCandidate, auditExpenseGroups } from "./etl/expense-candidate.mjs";
import { loadCanonicalExpenseBaseline } from "./etl/canonical-expense-baseline.mjs";
import { createR2ManifestClient, readConditionalManifest, putConditionalManifest } from "./etl/r2-conditional-manifest.mjs";
import { assertRemoteR2WriteBudget, configuredR2BudgetBuckets } from "./etl/r2-account-budget.mjs";
import { requireCloudflareDataCredentials } from "./etl/ci-env.mjs";
import { buildStaticInputManifest, sha256Buffer } from "./static-site-inputs.mjs";
import { buildReleaseSet } from "./release-set.mjs";

const encode = value => Buffer.from(JSON.stringify(value) + "\n");
const fail = message => { throw new Error(`EXPENSE_PROMOTION_${message}`); };
export function expenseReviewDigest(review) {
  return sha256Buffer(encode({ scope: review.scope, removedIds: review.removedIds, amountChanges: review.amountChanges, monthlyChanges: review.monthlyChanges, reasons: review.reasons }));
}

/** Manual approval is bound to exact candidate bytes, baseline rows and recomputed changes. */
export function planReviewedExpensePromotion({ baseline, envelope, approval, candidateSha256, sourceSha, manifest, index, now = new Date().toISOString() }) {
  buildReleaseSet(manifest);
  const sourceId = envelope?.sourceId;
  if (!["gastos_camara", "gastos_senado"].includes(sourceId) || envelope.schemaVersion !== 1 || sourceId !== baseline.sourceId
    || envelope.sourceSha !== sourceSha || !/^[a-f0-9]{40}$/.test(sourceSha ?? "")) fail("SOURCE_INVALID");
  const age = Date.parse(now) - Date.parse(envelope.review?.generatedAt);
  if (!Number.isFinite(age) || age < -600_000 || age > 86_400_000) fail("OBSERVATION_EXPIRED");
  const previous = assertExpenseSubsetIntegrity(baseline);
  const candidate = envelope.candidate;
  const records = assertExpenseSubsetIntegrity(candidate);
  if (candidate.sourceId !== sourceId || candidate.generatedAt !== envelope.review.generatedAt) fail("CANDIDATE_INVALID");
  const scope = envelope.review.scope;
  if (scope?.identities !== undefined) fail("PARTIAL_ROSTER_FORBIDDEN");
  const scoped = records.filter(row => scope?.periods?.includes(row.periodo));
  if (scoped.some(row => row.periodo > now.slice(0, 7))) fail("FUTURE_PERIOD");
  if (sourceId === "gastos_camara" && scoped.some(row => new URL(row.url).searchParams.get("prmId") !== row.diputado_id)) fail("DEPUTY_URL_MISMATCH");
  const recomputed = prepareExpenseCandidate({ baseline, incoming: scoped, scope, generatedAt: candidate.generatedAt });
  if (recomputed.candidate.checksumSha256 !== candidate.checksumSha256) fail("OUTSIDE_SCOPE_CHANGED");
  const stableBaseline = envelope.review.baselineRecordsChecksumSha256;
  if (stableBaseline ? stableBaseline !== recomputed.review.baselineRecordsChecksumSha256
    : recomputed.review.baselineChecksumSha256 !== envelope.review.baselineChecksumSha256) fail("STALE_BASELINE");
  if (sanitizeExpenseSubsetForPublication(candidate).excludedPeriods.length || recomputed.review.groups.some(g => g.issues.length)) fail("UNVERIFIED_AMOUNTS");
  const beforeGroups = auditExpenseGroups(previous, sourceId);
  const afterGroups = auditExpenseGroups(records, sourceId);
  for (const group of beforeGroups) {
    if (!afterGroups.some(after => after.period === group.period && after.identity === group.identity)) fail("AUTHORITY_MONTH_REMOVED");
  }
  for (const period of scope.periods.filter(p => !baseline.periods.includes(p))) {
    if (period < baseline.periods.at(-1)) fail("HISTORICAL_INSERTION_FORBIDDEN");
    const identities = new Set(scoped.filter(row => row.periodo === period).map(row => sourceId === "gastos_camara" ? row.diputado_id : row.nombre));
    const last = new Set(previous.filter(row => row.periodo === baseline.periods.at(-1)).map(row => sourceId === "gastos_camara" ? row.diputado_id : row.nombre));
    if (identities.size !== last.size || [...last].some(id => !identities.has(id))) fail("NEW_PERIOD_COVERAGE_INVALID");
  }
  if (recomputed.review.status === "requires-review") {
    if (!approval || approval.schemaVersion !== 1 || approval.candidateSha256 !== candidateSha256 || approval.sourceSha !== sourceSha
      || approval.baselineChecksumSha256 !== envelope.review.baselineChecksumSha256 || approval.changeDigest !== expenseReviewDigest(recomputed.review)
      || typeof approval.reason !== "string" || approval.reason.trim().length < 20) fail("EXPLICIT_REVIEW_REQUIRED");
    const reviewAge = Date.parse(now) - Date.parse(approval.reviewedAt);
    if (!Number.isFinite(reviewAge) || reviewAge < -600_000 || reviewAge > 86_400_000) fail("APPROVAL_EXPIRED");
  }
  if (JSON.stringify(previous) === JSON.stringify(records)) return { action: "unchanged", manifest, payloads: [], review: recomputed.review };
  if (index?.schemaVersion !== 1 || index.dataset !== "gastos-operacionales-por-periodo" || index.sources?.length !== 2
    || new Set(index.sources.map(s => s.sourceId)).size !== 2 || !index.sources.some(s => s.sourceId === sourceId)) fail("INDEX_INVALID");
  const files = new Map(manifest.files.map(file => [file.path, file]));
  const payloads = [];
  function stage(path, value, metadata = {}) {
    const bytes = encode(value);
    const checksumSha256 = sha256Buffer(bytes);
    const entry = { path, key: `projections/static-site-v1/releases/${checksumSha256}/${path}`, size: bytes.length, checksumSha256, ...metadata };
    files.set(path, entry); payloads.push({ entry, bytes });
  }
  stage(`data/lake-subsets/${sourceId.replace("_", "-")}.subset.json`, candidate);
  const shards = buildExpensePeriodShards(candidate);
  for (const { period, payload } of shards.filter(s => scope.periods.includes(s.period))) {
    stage(`data/lake-subsets/expense-periods/${sourceId}/${period}.json`, payload, { sourceId, period, recordCount: payload.recordCount });
  }
  stage("data/lake-subsets/expense-periods/manifest.json", { ...index, generatedAt: now, sources: index.sources.map(s => ({ ...s, periods: [...files.values()]
    .filter(f => f.sourceId === s.sourceId && f.path === `data/lake-subsets/expense-periods/${s.sourceId}/${f.period}.json`)
    .map(f => ({ period: f.period, path: f.path, recordCount: f.recordCount })).sort((a, b) => a.period.localeCompare(b.period)) })) });
  const next = buildStaticInputManifest({ entries: [...files.values()], generatedAt: now });
  buildReleaseSet(next);
  return { action: "ready", manifest: next, payloads, review: recomputed.review };
}

export async function main() {
  if (process.env.GITHUB_ACTIONS !== "true") fail("CI_ONLY");
  const checksum = process.env.EXPENSE_CANDIDATE_SHA256;
  const reviewChecksum = process.env.EXPENSE_REVIEW_SHA256;
  const sourceSha = process.env.EXPENSE_SOURCE_SHA;
  if (!/^[a-f0-9]{64}$/.test(checksum ?? "") || !/^[a-f0-9]{40}$/.test(sourceSha ?? "") || (reviewChecksum && !/^[a-f0-9]{64}$/.test(reviewChecksum))) fail("REFERENCE_INVALID");
  const credentials = requireCloudflareDataCredentials();
  const client = await createR2ManifestClient(credentials);
  const bucket = "transparencia-public-data";
  const url = key => client.url(bucket, key);
  async function read(file) {
    const response = await client.fetch(url(file.key), { headers: { "Accept-Encoding": "identity" } });
    if (!response.ok || Number(response.headers.get("content-length")) > 128 * 1024 * 1024) fail(`READ_${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 128 * 1024 * 1024 || sha256Buffer(bytes) !== file.checksumSha256 || (file.size !== undefined && bytes.length !== file.size)) fail("CHECKSUM_MISMATCH");
    return bytes;
  }
  const current = await readConditionalManifest({ url: url("projections/static-site-v1/manifest.json"), fetchImpl: client.fetch });
  const envelope = JSON.parse(await read({ key: `projections/staging/expense-candidates/${checksum}.json`, checksumSha256: checksum }));
  const approval = reviewChecksum ? JSON.parse(await read({ key: `projections/staging/expense-reviews/${reviewChecksum}.json`, checksumSha256: reviewChecksum })) : undefined;
  const baseline = await loadCanonicalExpenseBaseline(current.manifest, envelope.sourceId, read);
  const index = JSON.parse(await read(current.manifest.files.find(f => f.path === "data/lake-subsets/expense-periods/manifest.json")));
  const plan = planReviewedExpensePromotion({ baseline, envelope, approval, candidateSha256: checksum, sourceSha, manifest: current.manifest, index });
  const output = resolve(".ci-data-version/expense-promotion"); mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, "manifest-before.json"), current.body);
  writeFileSync(resolve(output, "review.json"), JSON.stringify(plan.review, null, 2));
  const receipt = { action: plan.action, sourceId: envelope.sourceId, sourceSha, candidateSha256: checksum, reviewSha256: reviewChecksum || null, previousManifestChecksum: current.manifest.checksumSha256, manifestChecksum: plan.manifest.checksumSha256, releaseSetId: buildReleaseSet(plan.manifest).releaseSetId };
  if (plan.action === "ready") {
    const body = JSON.stringify(plan.manifest, null, 2) + "\n";
    await assertRemoteR2WriteBudget({ ...credentials, buckets: configuredR2BudgetBuckets(bucket), puts: [...plan.payloads.map(p => ({ bucket, key: p.entry.key, size: p.bytes.length })), { bucket, key: "projections/static-site-v1/manifest.json", size: Buffer.byteLength(body) }] });
    for (const { entry, bytes } of plan.payloads) {
      const response = await client.fetch(url(entry.key), { method: "PUT", headers: { "If-None-Match": "*", "Content-Type": "application/json" }, body: bytes });
      if (!response.ok && response.status !== 412) fail(`WRITE_${response.status}`);
      await read(entry);
    }
    await putConditionalManifest({ url: url("projections/static-site-v1/manifest.json"), etag: current.etag, body, fetchImpl: client.fetch });
    const check = await readConditionalManifest({ url: url("projections/static-site-v1/manifest.json"), fetchImpl: client.fetch });
    if (check.manifest.checksumSha256 !== plan.manifest.checksumSha256) fail("READBACK_MISMATCH");
    receipt.action = "published";
  }
  writeFileSync(resolve(output, "receipt.json"), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt));
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
