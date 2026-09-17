import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { AwsClient } from "aws4fetch";
import { isPlausibleCpltPeriod } from "./etl/cplt-personal.mjs";
import { assertRemoteR2WriteBudget } from "./etl/r2-account-budget.mjs";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!accountId || !token) throw new Error("CPLT_RECONCILIATION_MISSING_CREDENTIALS");
const root = resolve(process.argv.find(v => v.startsWith("--output="))?.slice(9) ?? "../artifacts/cplt-index-reconciliation");
const scope = process.argv.includes("--municipal") ? "funcionarios-v1" : "funcionarios-central-v1";
const bucket = "transparencia-public-data";
const sha = value => createHash("sha256").update(value).digest("hex");
const verified = await (await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", { headers: { Authorization: `${"Bea"}rer ${token}` } })).json();
if (!verified.success || verified.result?.status !== "active" || !verified.result?.id) throw new Error("CPLT_RECONCILIATION_TOKEN_INVALID");
const client = new AwsClient({ accessKeyId: verified.result.id, secretAccessKey: sha(Buffer.from(token)), service: "s3", region: "auto" });
async function request(key, init = {}) {
  const path = key.split("/").map(encodeURIComponent).join("/");
  const response = await client.fetch(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${path}`, { ...init, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`CPLT_RECONCILIATION_HTTP_${response.status}:${key}`);
  return response;
}
async function bytes(key) { return Buffer.from(await (await request(key)).arrayBuffer()); }
await mkdir(root, { recursive: true });
let previousReport;
try { previousReport = JSON.parse(await readFile(join(root,"report.json"),"utf8")); } catch { /* First execution. */ }
if (previousReport?.published) {
  for (const item of previousReport.puts) if (sha(await bytes(item.key)) !== item.checksumSha256) throw new Error("CPLT_RECONCILIATION_PUBLISHED_RELEASE_CHANGED");
  console.log(JSON.stringify({ ...previousReport, idempotent:true }));
  process.exit(0);
}
const manifestKey = `projections/${scope}/manifest.json`;
const manifestBytes = await bytes(manifestKey);
const manifest = JSON.parse(manifestBytes);
const indexKey = manifest.searchIndex?.key;
if (!indexKey) throw new Error("CPLT_RECONCILIATION_INDEX_REQUIRED");
const indexBytes = await bytes(indexKey);
const index = JSON.parse(indexBytes);
if (!Array.isArray(index.pages) || index.pages.reduce((n,p) => n + p.count, 0) !== index.totalRows) throw new Error("CPLT_RECONCILIATION_PAGE_COUNTS");
const invalid = Object.entries(index.filters ?? {}).filter(([key]) => key.startsWith("periodo:") && !isPlausibleCpltPeriod(key.slice(8), manifest.generatedAt.slice(0,7)));
const cache = join(root, "filters");
await mkdir(cache, { recursive: true });
let cursor = 0;
const positions = new Set();
if (index.publicationExclusions) {
  const data = await bytes(index.publicationExclusions.key);
  if (sha(data) !== index.publicationExclusions.checksumSha256) throw new Error("CPLT_RECONCILIATION_PREVIOUS_EXCLUSION_CHECKSUM");
  const rows = JSON.parse(data);
  if (rows.length !== index.publicationExclusions.count || rows.some((v,i) => !Number.isSafeInteger(v) || v < 0 || v >= index.totalRows || (i > 0 && rows[i-1] >= v))) throw new Error("CPLT_RECONCILIATION_PREVIOUS_EXCLUSION_INVALID");
  for (const position of rows) positions.add(position);
}
await Promise.all(Array.from({ length: 8 }, async () => {
  while (cursor < invalid.length) {
    const [period, descriptor] = invalid[cursor++];
    const path = join(cache, sha(Buffer.from(descriptor.key)) + ".json");
    let data;
    try { data = await readFile(path); } catch { data = await bytes(descriptor.key); await writeFile(path, data); }
    const artifact = manifest.assets.find(asset => asset.key === descriptor.key);
    if (!artifact?.checksumSha256 || sha(data) !== artifact.checksumSha256) throw new Error(`CPLT_RECONCILIATION_FILTER_CHECKSUM:${period}`);
    const rows = JSON.parse(data);
    if (!Array.isArray(rows) || rows.length !== descriptor.count || rows.some((v,i) => !Number.isSafeInteger(v) || v < 0 || v >= index.totalRows || (i > 0 && rows[i-1] >= v))) throw new Error(`CPLT_RECONCILIATION_FILTER_INVALID:${period}`);
    for (const position of rows) {
      if (positions.has(position)) throw new Error("CPLT_RECONCILIATION_PERIOD_OVERLAP");
      positions.add(position);
    }
  }
}));
const excluded = [...positions].sort((a,b) => a-b);
const exclusionBytes = Buffer.from(JSON.stringify(excluded) + "\n");
const exclusionKey = indexKey.replace(/search_index\.json$/, `search_index/publication-exclusions-${sha(exclusionBytes)}.json`);
if (exclusionKey === indexKey) throw new Error("CPLT_RECONCILIATION_INDEX_KEY");
const updated = structuredClone(index);
for (const [key] of invalid) delete updated.filters[key];
updated.publicationExclusions = { key: exclusionKey, count: excluded.length, checksumSha256: sha(exclusionBytes), reason: "periodo_fuera_del_corte", cutoff: manifest.generatedAt.slice(0,7) };
const updatedBytes = Buffer.from(JSON.stringify(updated) + "\n");
const updatedManifest = structuredClone(manifest);
updatedManifest.assets = manifest.assets.filter(asset => asset.key !== exclusionKey).map(asset => asset.key === indexKey ? { ...asset, checksumSha256: sha(updatedBytes), size: updatedBytes.length } : asset);
updatedManifest.assets.push({ key: exclusionKey, checksumSha256: sha(exclusionBytes), size: exclusionBytes.length });
const updatedManifestBytes = Buffer.from(JSON.stringify(updatedManifest) + "\n");
const rollbackBytes = gzipSync(Buffer.from(JSON.stringify({
  schemaVersion: 1, scope, version: manifest.version,
  objects: [
    { key: indexKey, checksumSha256: sha(indexBytes), dataBase64: indexBytes.toString("base64") },
    { key: manifestKey, checksumSha256: sha(manifestBytes), dataBase64: manifestBytes.toString("base64") },
  ],
})), { level: 9 });
const rollbackKey = `audit/rollbacks/cplt-index/${scope}/${sha(rollbackBytes)}.json.gz`;
const puts = [
  { key: rollbackKey, data: rollbackBytes, contentType: "application/gzip" },
  { key: exclusionKey, data: exclusionBytes },
  { key: indexKey, data: updatedBytes },
  { key: manifestKey, data: updatedManifestBytes },
];
await writeFile(join(root,"manifest-before.json"), manifestBytes);
await writeFile(join(root,"index-before.json"), indexBytes);
for (let i=0;i<puts.length;i++) await writeFile(join(root,`candidate-${i}.json`),puts[i].data);
const budget = await assertRemoteR2WriteBudget({ accountId, token, buckets: [bucket], puts: puts.map(v => ({ bucket, key:v.key, size:v.data.length })), deletes: [] });
const report = { generatedAt: new Date().toISOString(), scope, version: manifest.version, physicalRows: index.totalRows, invalidPeriods: invalid.length, excludedRows: excluded.length, indexBeforeSha256: sha(indexBytes), manifestBeforeSha256: sha(manifestBytes), rollbackKey, puts: puts.map(v => ({ key:v.key, size:v.data.length, checksumSha256:sha(v.data) })), budget, published:false };
if (process.argv.includes("--apply")) {
  if (!process.argv.includes("--worker-validated")) throw new Error("CPLT_RECONCILIATION_WORKER_VALIDATION_REQUIRED");
  if (sha(await bytes(manifestKey)) !== report.manifestBeforeSha256 || sha(await bytes(indexKey)) !== report.indexBeforeSha256) throw new Error("CPLT_RECONCILIATION_BASELINE_CHANGED");
  try {
    for (const put of puts) {
      await request(put.key,{ method:"PUT", body:put.data, headers:{ "Content-Type":put.contentType ?? "application/json" } });
      if (sha(await bytes(put.key)) !== sha(put.data)) throw new Error("CPLT_RECONCILIATION_UPLOAD_MISMATCH");
    }
  } catch (error) {
    // Retain immutable evidence, but restore both active pointers if promotion fails.
    for (const [key,data] of [[indexKey,indexBytes],[manifestKey,manifestBytes]]) {
      await request(key,{method:"PUT",body:data,headers:{"Content-Type":"application/json"}});
      if (sha(await bytes(key)) !== sha(data)) throw new Error("CPLT_RECONCILIATION_ROLLBACK_FAILED",{cause:error});
    }
    throw error;
  }
  report.published=true;
}
await writeFile(join(root,"report.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify({ scope, invalidPeriods:report.invalidPeriods, excludedRows:excluded.length, oldIndexBytes:indexBytes.length, newIndexBytes:updatedBytes.length, peakBytes:budget.peakBytes, published:report.published }));
