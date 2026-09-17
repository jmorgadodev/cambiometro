import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { gunzipSync } from "node:zlib";
import { spawnSync } from "node:child_process";
import { listR2Objects } from "../lib/r2-live-list.mjs";
import { auditCatalogReferences } from "../lib/r2-catalog-audit.mjs";
import { assertRemoteR2WriteBudget, configuredR2BudgetBuckets } from "./etl/r2-account-budget.mjs";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!accountId || !token) throw new Error("ARCHIVE_RESTORE_MISSING_CREDENTIALS");
const bucket = "transparencia-public-data";
const root = resolve(process.argv.find(v => v.startsWith("--output="))?.slice(9) ?? "../artifacts/catalog-restore-20260917");
const apply = process.argv.includes("--apply");
const headers = { Authorization: `Bearer ${token}` };
const sha = value => createHash("sha256").update(value).digest("hex");
const catalogKey = "catalog/v1/manifest.json";
async function remote(key) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucket}/objects/${encodeURIComponent(key)}`, { headers, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`ARCHIVE_R2_HTTP_${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
function pathFor(key) {
  const path = resolve(root, key);
  if (!path.startsWith(root + sep)) throw new Error("ARCHIVE_RESTORE_INVALID_KEY");
  return path;
}
async function stage(key, bytes) {
  const path = pathFor(key);
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, bytes);
  return { key, size: bytes.length, checksumSha256: sha(bytes) };
}
const catalogBytes = await remote(catalogKey);
const catalog = JSON.parse(catalogBytes);
const inventory = await listR2Objects({ accountId, token, bucket });
const known = new Map(inventory.map(v => [v.key, v]));
const missing = auditCatalogReferences(catalog, new Set(known.keys())).missing;
const report = { generatedAt: new Date().toISOString(), catalogSha256: sha(catalogBytes), missingPartitions: missing.length, restored: [], unavailable: [], puts: [] };
await mkdir(root, { recursive: true });
await writeFile(join(root, "catalog-before.json"), catalogBytes);
let cursor = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (cursor < missing.length) {
    const item = missing[cursor++];
    const partition = catalog.partitions.find(v => v.id === item.id);
    try {
      if (!partition.releaseTag || !partition.manifestAssetName) throw new Error("ARCHIVE_REFERENCE_MISSING");
      const base = `https://github.com/jmorgadodev/cambiometro/releases/download/${encodeURIComponent(partition.releaseTag)}/`;
      const response = await fetch(base + encodeURIComponent(partition.manifestAssetName), { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`ARCHIVE_MANIFEST_HTTP_${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const manifest = JSON.parse(bytes);
      if (manifest.id !== item.id || manifest.sourceId !== item.sourceId || manifest.recordCount !== item.recordCount) throw new Error("ARCHIVE_MANIFEST_IDENTITY_MISMATCH");
      const parts = manifest.artifacts.filter(v => /records.*\.jsonl\.gz(?:\.part-\d+)?$/.test(v.key)).sort((a,b) => a.key.localeCompare(b.key));
      if (!parts.length) throw new Error("ARCHIVE_NO_RECORDS");
      const chunks = [];
      const puts = [];
      for (const part of parts) {
        if (!part.key.startsWith(`partitions/${item.id}/`)) throw new Error("ARCHIVE_RECORD_KEY_MISMATCH");
        const download = await fetch(base + encodeURIComponent(part.releaseAssetName), { signal: AbortSignal.timeout(60000) });
        if (!download.ok) throw new Error(`ARCHIVE_RECORD_HTTP_${download.status}`);
        const chunk = Buffer.from(await download.arrayBuffer());
        if (sha(chunk) !== part.checksumSha256 || (part.size != null && part.size !== chunk.length)) throw new Error("ARCHIVE_RECORD_CHECKSUM_MISMATCH");
        chunks.push(chunk);
        if (!known.has(part.key)) puts.push(await stage(part.key, chunk));
      }
      const compressed = Buffer.concat(chunks);
      if (sha(compressed) !== manifest.projectionChecksumSha256 || sha(compressed) !== partition.checksumSha256) throw new Error("ARCHIVE_PARTITION_CHECKSUM_MISMATCH");
      const text = gunzipSync(compressed).toString("utf8");
      const rows = text.trim() ? text.trim().split("\n").map(v => JSON.parse(v)) : [];
      if (rows.length !== item.recordCount || rows.some(v => v.sourceId !== item.sourceId) || new Set(rows.map(v => v.id)).size !== rows.length) throw new Error("ARCHIVE_ROWS_MISMATCH");
      puts.push(await stage(item.manifestKey, bytes));
      report.restored.push({ id: item.id, rows: rows.length, bytes: puts.reduce((n,v) => n + v.size, 0), checksum: sha(compressed) });
      report.puts.push(...puts);
    } catch (error) {
      report.unavailable.push({ id: item.id, reason: error.message });
    }
  }
}));
report.puts = [...new Map(report.puts.map(v => [v.key,v])).values()];
report.newBytes = report.puts.reduce((n,v) => n + v.size, 0);
report.budget = await assertRemoteR2WriteBudget({ accountId, token, buckets: configuredR2BudgetBuckets(bucket), puts: report.puts.map(v => ({ ...v, bucket })), deletes: [] });
if (apply) {
  if (sha(await remote(catalogKey)) !== report.catalogSha256) throw new Error("ARCHIVE_CATALOG_CHANGED_REPLAN_REQUIRED");
  const liveKeys = new Set((await listR2Objects({ accountId, token, bucket })).map(v => v.key));
  for (const item of report.puts.sort((a,b) => Number(a.key.endsWith("manifest.json")) - Number(b.key.endsWith("manifest.json")))) {
    if (liveKeys.has(item.key)) {
      if (sha(await remote(item.key)) !== item.checksumSha256) throw new Error("ARCHIVE_CONCURRENT_OBJECT_CONFLICT");
      continue;
    }
    if (sha(await readFile(pathFor(item.key))) !== item.checksumSha256) throw new Error("ARCHIVE_LOCAL_CHECKSUM_CHANGED");
    const result = spawnSync(process.execPath, [resolve("node_modules/wrangler/bin/wrangler.js"), "r2", "object", "put", `${bucket}/${item.key}`, "--file", pathFor(item.key), "--remote"], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(`ARCHIVE_UPLOAD_FAILED:${item.key}`);
    if (sha(await remote(item.key)) !== item.checksumSha256) throw new Error("ARCHIVE_UPLOAD_CHECKSUM_MISMATCH");
  }
  report.published = true;
}
await writeFile(join(root, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ mode: apply ? "apply" : "plan", missing: missing.length, verified: report.restored.length, unavailable: report.unavailable, newBytes: report.newBytes, currentBytes: report.budget.currentBytes, peakBytes: report.budget.peakBytes, published: report.published ?? false }, null, 2));
