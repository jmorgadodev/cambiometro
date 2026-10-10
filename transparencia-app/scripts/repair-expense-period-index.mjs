import { createR2ManifestClient, readConditionalManifest, putConditionalManifest } from "./etl/r2-conditional-manifest.mjs";
import { assertRemoteR2WriteBudget } from "./etl/r2-account-budget.mjs";
import { retainPublishedExpensePeriods } from "./expense-release.mjs";
import { buildStaticInputManifest, sha256Buffer } from "./static-site-inputs.mjs";
import { buildReleaseSet } from "./release-set.mjs";

const credentials = { accountId: process.env.CLOUDFLARE_ACCOUNT_ID, token: process.env.CLOUDFLARE_API_TOKEN };
const bucket = "transparencia-public-data";
const manifestKey = "projections/static-site-v1/manifest.json";
const indexPath = "data/lake-subsets/expense-periods/manifest.json";
const client = await createR2ManifestClient(credentials);
const manifestUrl = client.url(bucket, manifestKey);
const previous = await readConditionalManifest({ url: manifestUrl, fetchImpl: client.fetch });
buildReleaseSet(previous.manifest);
const entry = previous.manifest.files.find((file) => file.path === indexPath);
if (!entry) throw new Error("EXPENSE_INDEX_REQUIRED");
const response = await client.fetch(client.url(bucket, entry.key), { headers: { "Accept-Encoding": "identity" } });
if (!response.ok) throw new Error(`EXPENSE_INDEX_READ_${response.status}`);
const original = Buffer.from(await response.arrayBuffer());
if (original.length !== entry.size || sha256Buffer(original) !== entry.checksumSha256) throw new Error("EXPENSE_INDEX_CHECKSUM_MISMATCH");
const index = JSON.parse(original.toString("utf8"));
if (index.schemaVersion !== 1 || index.dataset !== "gastos-operacionales-por-periodo") throw new Error("EXPENSE_INDEX_INVALID");
const repaired = retainPublishedExpensePeriods(index, previous.manifest);
const content = Buffer.from(`${JSON.stringify(repaired)}\n`);
const checksum = sha256Buffer(content);
const newEntry = { ...entry, key: `projections/static-site-v1/releases/${checksum}/${indexPath}`, size: content.length, checksumSha256: checksum };
const manifest = buildStaticInputManifest({ entries: previous.manifest.files.map((file) => file.path === indexPath ? newEntry : file) });
buildReleaseSet(manifest);
const body = `${JSON.stringify(manifest, null, 2)}\n`;
const budget = await assertRemoteR2WriteBudget({ ...credentials, puts: [
  { bucket, key: newEntry.key, size: content.length }, { bucket, key: manifestKey, size: Buffer.byteLength(body) },
] });
const report = { action: "preflight", periodsBefore: index.sources.map((source) => ({ source: source.sourceId, months: source.periods.length })),
  periodsAfter: repaired.sources.map((source) => ({ source: source.sourceId, months: source.periods.length })),
  currentBytes: budget.currentBytes, projectedBytes: budget.projectedBytes, newIndexBytes: content.length,
  previousManifestChecksum: previous.manifest.checksumSha256, manifestChecksum: manifest.checksumSha256 };
if (process.argv.includes("--publish") && checksum !== entry.checksumSha256) {
  const put = await client.fetch(client.url(bucket, newEntry.key), { method: "PUT", headers: { "If-None-Match": "*", "Content-Type": "application/json" }, body: content });
  if (!put.ok && put.status !== 412) throw new Error(`EXPENSE_INDEX_WRITE_${put.status}`);
  if (put.status === 412) {
    const existing = await client.fetch(client.url(bucket, newEntry.key), { headers: { "Accept-Encoding": "identity" } });
    if (!existing.ok || sha256Buffer(Buffer.from(await existing.arrayBuffer())) !== checksum) throw new Error("EXPENSE_INDEX_EXISTING_MISMATCH");
  }
  await putConditionalManifest({ url: manifestUrl, etag: previous.etag, body, fetchImpl: client.fetch });
  const published = await readConditionalManifest({ url: manifestUrl, fetchImpl: client.fetch });
  if (published.manifest.checksumSha256 !== manifest.checksumSha256) throw new Error("EXPENSE_INDEX_PROMOTION_MISMATCH");
  report.action = "published";
}
console.log(JSON.stringify(report));
