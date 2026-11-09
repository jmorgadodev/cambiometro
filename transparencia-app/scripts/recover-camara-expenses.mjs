import { readFileSync } from "node:fs";
import { buildExpenseSubset, buildExpensePeriodShards, sanitizeExpenseSubsetForPublication, retainPublishedExpensePeriods } from "./expense-release.mjs";
import { buildStaticInputManifest, assertStaticInputManifest, assertStaticInputContentQuality, sha256Buffer } from "./static-site-inputs.mjs";
import { buildReleaseSet } from "./release-set.mjs";
import { assertRemoteR2WriteBudget, configuredR2BudgetBuckets } from "./etl/r2-account-budget.mjs";


const sourceId = "gastos_camara";
const sourceUrl = "https://www.camara.cl/diputados/detalle/gastosoperacionales.aspx";
const periods = ["2026-07", "2026-08"];
const expectedAlessandri = [6302618, 5466990];
const subsetPath = "data/lake-subsets/gastos-camara.subset.json";
const indexPath = "data/lake-subsets/expense-periods/manifest.json";
const manifestKey = "projections/static-site-v1/manifest.json";
const bucket = "transparencia-public-data";
const encode = (value) => Buffer.from(JSON.stringify(value) + "\n");
const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const requireValid = (condition, message) => { if (!condition) throw new Error(message); };

function recover(observation, baseline) {
  const { subset: previous } = sanitizeExpenseSubsetForPublication(baseline);
  const { items, deputies, observedAt } = observation;
  requireValid(observation.source === sourceUrl && observation.year === 2026 &&
    JSON.stringify(observation.months) === "[7,8]" && Number.isFinite(Date.parse(observedAt)), "INVALID_OBSERVATION");
  requireValid(Array.isArray(items) && items.length === 21 && items.every((item) => typeof item === "string" && normalize(item)), "INVALID_ITEM_LIST");
  const itemSlots = new Map(items.map((item, i) => [normalize(item), i]));
  const ids = Object.keys(deputies ?? {});
  requireValid(itemSlots.size === 21 && ids.length === 155 && ids.every((id) => /^\d+$/.test(id)), "INVALID_CAPTURE_ROSTER");
  requireValid(ids.every((id) => Array.isArray(deputies[id]) && deputies[id].length === 2 &&
    deputies[id].every((amounts) => Array.isArray(amounts) && amounts.length === 21 &&
      amounts.every((amount) => Number.isSafeInteger(amount) && amount >= 0))), "INVALID_CAPTURE_AMOUNTS");

  const verifiedRows = [];
  const report = periods.map((period, month) => {
    const oldRows = baseline.records.filter((row) => row.periodo === period);
    const matches = new Set();
    requireValid(oldRows.length === 3255, "BASELINE_MONTH_COVERAGE_CHANGED:" + period);
    for (const row of oldRows) {
      const slot = itemSlots.get(normalize(row.item));
      const identity = row.diputado_id + "/" + slot;
      requireValid(slot !== undefined && Object.hasOwn(deputies, row.diputado_id) && !matches.has(identity), "ITEM_OR_DEPUTY_MISMATCH:" + row.id);
      requireValid(row.url === sourceUrl + "?prmId=" + row.diputado_id, "SOURCE_URL_MISMATCH:" + row.id);
      matches.add(identity);
      const monto_clp = deputies[row.diputado_id][month][slot];
      requireValid(row.monto_clp === 0 || row.monto_clp === monto_clp, "CONFLICT_WITH_PUBLISHED_AMOUNT:" + row.id);
      verifiedRows.push({ ...row, monto_clp });
    }
    const alessandri = deputies["1009"][month].reduce((total, value) => total + value, 0);
    const positive = ids.reduce((count, id) => count + deputies[id][month].filter((amount) => amount > 0).length, 0);
    requireValid(alessandri === expectedAlessandri[month] && positive > 0, "AMOUNT_RECONCILIATION_FAILED:" + period);
    return { period, deputies: ids.length, rows: matches.size, positive, alessandri };
  });
  const next = buildExpenseSubset({ sourceId, generatedAt: observedAt,
    records: [...baseline.records.filter((row) => !periods.includes(row.periodo)), ...verifiedRows] });
  const { subset: validated, excludedPeriods } = sanitizeExpenseSubsetForPublication(next);
  requireValid(next.recordCount === baseline.recordCount && previous.periods.every((period) => validated.periods.includes(period)) &&
    periods.every((period) => validated.periods.includes(period)) && !excludedPeriods.some(({ period }) => periods.includes(period)), "RECOVERY_REGRESSION");
  return { next, validated, report };
}

const [argument, baselineFile] = process.argv.slice(2);
if (baselineFile) {
  const { report } = recover(JSON.parse(readFileSync(argument, "utf8")), JSON.parse(readFileSync(baselineFile, "utf8")));
  console.log(JSON.stringify({ action: "validated", report }));
} else {
  requireValid(/^[a-f0-9]{64}$/.test(argument ?? ""), "OBSERVATION_CHECKSUM_REQUIRED");
  const credentials = { accountId: process.env.CLOUDFLARE_ACCOUNT_ID, token: process.env.CLOUDFLARE_API_TOKEN };
  const { createR2ManifestClient, readConditionalManifest, putConditionalManifest } = await import("./etl/r2-conditional-manifest.mjs");
  const client = await createR2ManifestClient(credentials);
  const objectUrl = (key) => client.url(bucket, key);
  async function readObject(key, checksum, size) {
    const response = await client.fetch(objectUrl(key), { headers: { "Accept-Encoding": "identity" } });
    requireValid(response.ok, "R2_READ_FAILED:" + response.status);
    const bytes = Buffer.from(await response.arrayBuffer());
    requireValid(sha256Buffer(bytes) === checksum && (size === undefined || bytes.length === size), "R2_CHECKSUM_MISMATCH:" + key);
    return JSON.parse(bytes.toString("utf8"));
  }
  const observation = await readObject("projections/staging/camara-expenses/" + argument + ".json", argument);
  const manifestUrl = objectUrl(manifestKey);
  const { manifest, etag } = await readConditionalManifest({ url: manifestUrl, fetchImpl: client.fetch });
  assertStaticInputManifest(manifest);
  buildReleaseSet(manifest);
  const files = new Map(manifest.files.map((entry) => [entry.path, entry]));
  async function readInput(path) {
    const entry = files.get(path);
    requireValid(entry, "STATIC_INPUT_MISSING:" + path);
    return readObject(entry.key, entry.checksumSha256, entry.size);
  }
  const [baseline, index] = await Promise.all([readInput(subsetPath), readInput(indexPath)]);
  const { next, validated, report } = recover(observation, baseline);
  const payloads = new Map();
  function stage(path, value, metadata = {}) {
    const body = encode(value);
    assertStaticInputContentQuality(path, body);
    const checksumSha256 = sha256Buffer(body);
    const key = "projections/static-site-v1/releases/" + checksumSha256 + "/" + path;
    const entry = { path, key, size: body.length, checksumSha256, ...metadata };
    if (files.get(path)?.checksumSha256 !== checksumSha256) {
      payloads.set(key, body);
      files.set(path, entry);
    }
  }
  stage(subsetPath, next);
  for (const { period, payload } of buildExpensePeriodShards(validated)) {
    if (!periods.includes(period)) continue;
    const path = "data/lake-subsets/expense-periods/" + sourceId + "/" + period + ".json";
    stage(path, payload, { sourceId, period, recordCount: payload.recordCount });
  }
  stage(indexPath, retainPublishedExpensePeriods(index, { files: [...files.values()] }));
  if (payloads.size === 0) console.log(JSON.stringify({ action: "already-published", report }));
  else {
    const updated = buildStaticInputManifest({ entries: [...files.values()] });
    assertStaticInputManifest(updated);
    buildReleaseSet(updated);
    const body = JSON.stringify(updated, null, 2) + "\n";
    const budget = await assertRemoteR2WriteBudget({ ...credentials, buckets: configuredR2BudgetBuckets(bucket), puts: [
      ...[...payloads].map(([key, value]) => ({ bucket, key, size: value.length })),
      { bucket, key: manifestKey, size: Buffer.byteLength(body) },
    ] });
    for (const [key, content] of payloads) {
      const response = await client.fetch(objectUrl(key), { method: "PUT",
        headers: { "If-None-Match": "*", "Content-Type": "application/json" }, body: content });
      requireValid(response.ok || response.status === 412, "ARTIFACT_WRITE_FAILED:" + response.status);
      await readObject(key, sha256Buffer(content), content.length);
    }
    await putConditionalManifest({ url: manifestUrl, etag, body, fetchImpl: client.fetch });
    const published = await readConditionalManifest({ url: manifestUrl, fetchImpl: client.fetch });
    requireValid(published.manifest.checksumSha256 === updated.checksumSha256, "PROMOTED_CHECKSUM_MISMATCH");
    console.log(JSON.stringify({ action: "published", report, previous: manifest.checksumSha256, checksum: updated.checksumSha256,
      peakBytes: budget.peakBytes, thresholdBytes: budget.thresholdBytes }));
  }
}
