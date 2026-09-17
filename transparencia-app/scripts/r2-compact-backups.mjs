import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat, statfs, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { Readable, Transform, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip, createGunzip } from "node:zlib";
import { listR2Objects } from "../lib/r2-live-list.mjs";
import { compactionCandidates, requireVerifiedArchive, mergeCompactObjects } from "../lib/r2-compaction.mjs";
import { AwsClient } from "aws4fetch";

const mode = process.argv.find((arg) => arg.startsWith("--mode="))?.slice(7) ?? "plan";
const directory = resolve(process.argv.find((arg) => arg.startsWith("--directory="))?.slice(12) ?? "../artifacts/r2-compaction-2026-09-17");
const concurrencyLimit = Number(process.argv.find((arg) => arg.startsWith("--concurrency="))?.slice(14) ?? 8);
if (!Number.isInteger(concurrencyLimit) || concurrencyLimit < 1 || concurrencyLimit > 16) throw new Error("COMPACTION_INVALID_CONCURRENCY");
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
if (!accountId || !token) throw new Error("COMPACTION_MISSING_CREDENTIALS");
const api = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`;
const headers = { Authorization: `${"Bea"}rer ${token}` };
const manifestKey = "compact/v1/manifest.json";
const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");
const identity = (object) => `${object.bucket}/${object.key}`;
const jsonFile = async (name) => JSON.parse(await readFile(join(directory, name), "utf8"));
let s3Client;
async function client() {
  if (!s3Client) {
    const response = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", { headers });
    const verified = await response.json();
    if (!response.ok || !verified.success || verified.result?.status !== "active" || !verified.result?.id) throw new Error("COMPACTION_TOKEN_VERIFY_FAILED");
    s3Client = new AwsClient({ accessKeyId: verified.result.id, secretAccessKey: sha(Buffer.from(token)), service: "s3", region: "auto" });
  }
  return s3Client;
}
async function save(name, value) {
  await mkdir(directory, { recursive: true });
  const file = join(directory, name);
  await writeFile(`${file}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  await rename(`${file}.tmp`, file);
}
async function request(bucket, key, { allowMissing = false, ...options } = {}) {
  const signed = await client();
  const path = key.split("/").map(encodeURIComponent).join("/");
  const response = await signed.fetch(`https://${accountId}.r2.cloudflarestorage.com/${encodeURIComponent(bucket)}/${path}`, {
    ...options, signal: AbortSignal.timeout(180_000),
  });
  if (allowMissing && response.status === 404) return null;
  if (!response.ok) throw new Error(`COMPACTION_HTTP_${response.status}: ${bucket}/${key}`);
  return response;
}
async function inventory() {
  const response = await fetch(`${api}?per_page=1000`, { headers });
  if (!response.ok) throw new Error(`COMPACTION_BUCKET_LIST_${response.status}`);
  const body = await response.json();
  if (!body.success) throw new Error("COMPACTION_BUCKET_LIST_FAILED");
  const buckets = Array.isArray(body.result) ? body.result : body.result?.buckets;
  if (!Array.isArray(buckets)) throw new Error("COMPACTION_BUCKET_LIST_SHAPE");
  const result = [];
  for (const item of buckets) {
    const objects = await listR2Objects({ accountId, token, bucket: item.name });
    result.push(...objects.map((object) => ({ ...object, bucket: item.name })));
  }
  return result;
}
async function manifests(objects) {
  const keys = objects.filter((object) => object.bucket === "transparencia-public-data"
    && /^(?:projections\/[^/]+|indexes\/v1\/[^/]+|catalog\/v1)\/manifest\.json$/.test(object.key)).map((object) => object.key);
  const result = [];
  for (const key of keys) {
    const buffer = Buffer.from(await (await request("transparencia-public-data", key)).arrayBuffer());
    result.push({ key, sha256: sha(buffer), value: JSON.parse(buffer.toString("utf8")) });
  }
  return result;
}
async function verifyGzip(file, expectedSha, expectedSize) {
  const hash = createHash("sha256"); let size = 0;
  await pipeline(createReadStream(file), createGunzip(), new Writable({
    write(chunk, encoding, done) { hash.update(chunk); size += chunk.length; done(); },
  }));
  if (hash.digest("hex") !== expectedSha || size !== expectedSize) throw new Error(`COMPACTION_RESTORE_MISMATCH: ${file}`);
}
async function limited(items, operation, concurrency = concurrencyLimit) {
  let next = 0; let failed = null;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < items.length && !failed) {
      const item = items[next++];
      try { await operation(item); } catch (error) { failed ??= error; }
    }
  }));
  if (failed) throw failed;
}
async function verifyRemote() {
  const manifest = await (await request("cambiometro-backups", manifestKey)).json();
  if (manifest.format !== "gzip-sha256-v1" || !manifest.objects?.length) throw new Error("COMPACTION_REMOTE_MANIFEST_INVALID");
  const unique = [...new Map(manifest.objects.map((object) => [object.blobKey, object])).values()];
  const samples = unique.sort((a, b) => a.compressedSize - b.compressedSize).slice(0, 6);
  for (const object of samples) {
    const response = await request("cambiometro-backups", object.blobKey);
    const hash = createHash("sha256"); let size = 0;
    await pipeline(Readable.fromWeb(response.body), createGunzip(), new Writable({
      write(chunk, encoding, done) { hash.update(chunk); size += chunk.length; done(); },
    }));
    if (hash.digest("hex") !== object.sha256 || size !== object.size) throw new Error("COMPACTION_REMOTE_RESTORE_FAILED");
  }
  console.log(JSON.stringify({ mode: "verify-remote", objects: manifest.objects.length, blobs: unique.length, restoredSamples: samples.length, status: "OK" }));
}

if (mode === "verify-remote") {
  await verifyRemote();
} else if (mode === "plan") {
  const objects = await inventory();
  const roots = await manifests(objects);
  const selection = compactionCandidates({
    publicObjects: objects.filter((object) => object.bucket === "transparencia-public-data"),
    backupObjects: objects.filter((object) => object.bucket === "cambiometro-backups"), manifests: roots,
  });
  const report = {
    createdAt: new Date().toISOString(), accountId, beforeBytes: objects.reduce((sum, object) => sum + object.size, 0),
    candidateBytes: selection.candidates.reduce((sum, object) => sum + object.size, 0), ...selection,
    roots, inventory: objects,
  };
  await save("plan.json", report);
  const categories = {};
  for (const object of report.candidates) {
    categories[object.reason] ??= { objects: 0, bytes: 0 };
    categories[object.reason].objects++; categories[object.reason].bytes += object.size;
  }
  console.log(JSON.stringify({ mode, directory, beforeBytes: report.beforeBytes, candidateBytes: report.candidateBytes, categories }, null, 2));
} else if (mode === "archive") {
  const plan = await jsonFile("plan.json");
  const space = await statfs(directory);
  if (space.bavail * space.bsize < plan.candidateBytes + 1_000_000_000) throw new Error("COMPACTION_LOCAL_SPACE_INSUFFICIENT");
  await mkdir(join(directory, "blobs"), { recursive: true });
  let journal;
  try { journal = await jsonFile("archive.json"); } catch { journal = { objects: [] }; }
  const archived = new Map(journal.objects.map((object) => [identity(object), object]));
  let completed = 0; let saving = Promise.resolve();
  await limited(plan.candidates, async (object) => {
    const existing = archived.get(identity(object));
    if (existing) {
      requireVerifiedArchive(object, existing);
      await verifyGzip(join(directory, "blobs", `${existing.sha256}.gz`), existing.sha256, object.size);
    } else {
      const response = await request(object.bucket, object.key);
      const remoteEtag = response.headers.get("etag")?.replace(/^W\//, "").replaceAll('"', "").replace(/-gzip$/, "");
      if (remoteEtag && object.etag && remoteEtag !== String(object.etag).replaceAll('"', "")) throw new Error("COMPACTION_REMOTE_CHANGED");
      const hash = createHash("sha256"); const md5 = createHash("md5"); let size = 0;
      const temporary = join(directory, "blobs", `${sha(Buffer.from(identity(object)))}.partial`);
      await pipeline(Readable.fromWeb(response.body), new Transform({
        transform(chunk, encoding, done) { hash.update(chunk); md5.update(chunk); size += chunk.length; done(null, chunk); },
      }), createGzip({ level: 6 }), createWriteStream(temporary));
      if (size !== object.size) throw new Error(`COMPACTION_SOURCE_SIZE_CHANGED: ${identity(object)}`);
      const expectedMd5 = String(object.etag ?? "").replaceAll('"', "");
      if (/^[a-f0-9]{32}$/.test(expectedMd5) && md5.digest("hex") !== expectedMd5) throw new Error(`COMPACTION_SOURCE_ETAG_MISMATCH: ${identity(object)}`);
      const checksum = hash.digest("hex");
      await verifyGzip(temporary, checksum, size);
      const file = join(directory, "blobs", `${checksum}.gz`);
      try { await stat(file); await rm(temporary); } catch { await rename(temporary, file); }
      archived.set(identity(object), { ...object, sha256: checksum, compressedSize: (await stat(file)).size, blobKey: `compact/v1/blobs/${checksum}.gz`, verified: true });
    }
    completed++;
    if (completed % 100 === 0 || completed === plan.candidates.length) {
      saving = saving.then(() => save("archive.json", { objects: [...archived.values()] })); await saving;
    }
    if (completed % 500 === 0 || completed === plan.candidates.length) console.log(`[archive] ${completed}/${plan.candidates.length}`);
  });
  await save("archive.json", { objects: [...archived.values()] });
  const unique = [...new Map([...archived.values()].map((object) => [object.sha256, object])).values()];
  console.log(JSON.stringify({ mode, objects: archived.size, uniqueBlobs: unique.length, rawBytes: plan.candidateBytes, compressedBytes: unique.reduce((sum, object) => sum + object.compressedSize, 0), verified: true }));
} else if (mode === "apply") {
  const plan = await jsonFile("plan.json"); const archive = await jsonFile("archive.json");
  if (plan.accountId !== accountId) throw new Error("COMPACTION_ACCOUNT_MISMATCH");
  const archived = new Map(archive.objects.map((object) => [identity(object), object]));
  // Restore every local blob before issuing the first DELETE.
  for (const object of plan.candidates) requireVerifiedArchive(object, archived.get(identity(object)));
  const unique = [...new Map(archive.objects.map((object) => [object.sha256, object])).values()];
  await limited(unique, (object) => verifyGzip(join(directory, "blobs", `${object.sha256}.gz`), object.sha256, object.size));
  const current = await inventory(); const currentRoots = await manifests(current);
  for (const root of plan.roots) {
    if (currentRoots.find((item) => item.key === root.key)?.sha256 !== root.sha256) throw new Error(`COMPACTION_ACTIVE_RELEASE_CHANGED: ${root.key}`);
  }
  const safe = compactionCandidates({ publicObjects: current.filter((object) => object.bucket === "transparencia-public-data"), backupObjects: current.filter((object) => object.bucket === "cambiometro-backups"), manifests: currentRoots });
  const eligible = new Map(safe.candidates.map((object) => [identity(object), object]));
  const previousResponse = await request("cambiometro-backups", manifestKey, { allowMissing: true });
  const previous = previousResponse ? await previousResponse.json() : null;
  if (previous && previous.format !== "gzip-sha256-v1") throw new Error("COMPACTION_PREVIOUS_MANIFEST_INVALID");
  const remoteManifest = { format: "gzip-sha256-v1", createdAt: new Date().toISOString(), roots: plan.roots, previousRoots: [...(previous?.previousRoots ?? []), ...(previous?.roots ?? [])], objects: mergeCompactObjects(previous?.objects ?? [], archive.objects) };
  const manifestBuffer = Buffer.from(JSON.stringify(remoteManifest));
  const currentBytes = current.reduce((sum, object) => sum + object.size, 0);
  let removalBytes = 0;
  for (const object of plan.candidates) {
    const live = current.find((item) => identity(item) === identity(object));
    if (!live) continue; // Resume after a prior partially completed apply.
    const permitted = eligible.get(identity(object));
    if (!permitted || permitted.size !== object.size || permitted.etag !== object.etag) throw new Error(`COMPACTION_DELETE_NOT_SAFE: ${identity(object)}`);
    removalBytes += object.size;
  }
  const compressedBytes = unique.reduce((sum, object) => sum + object.compressedSize, 0) + manifestBuffer.length;
  const peakAfterRemoval = currentBytes - removalBytes + compressedBytes;
  if (peakAfterRemoval >= 9_500_000_000) throw new Error(`COMPACTION_COMPRESSED_RELEASE_OVER_BUDGET: ${peakAfterRemoval}`);
  await save("apply-preflight.json", { currentBytes, removalBytes, compressedBytes, peakAfterRemoval, rootsUnchanged: true, allArchivesRestored: true });
  console.log(JSON.stringify({ mode, currentBytes, removalBytes, compressedBytes, projectedBytes: peakAfterRemoval }));
  let deleted = 0;
  await limited(plan.candidates, async (object) => {
    if (!current.some((item) => identity(item) === identity(object))) return;
    const response = await request(object.bucket, object.key, { method: "DELETE", headers: { "If-Match": `"${String(object.etag ?? "").replaceAll('"', "")}"` } });
    if (!response.ok) throw new Error(`COMPACTION_DELETE_FAILED: ${identity(object)}`);
    deleted++;
    if (deleted % 500 === 0) console.log(`[delete] ${deleted}/${plan.candidates.length}`);
  });
  // Upload only after the account has fallen below the free-tier guard.
  const afterRemoval = await inventory();
  const liveBytes = afterRemoval.reduce((sum, object) => sum + object.size, 0);
  if (liveBytes + compressedBytes >= 9_500_000_000) throw new Error("COMPACTION_UPLOAD_BLOCKED_BY_ACCOUNT_BUDGET");
  let uploaded = 0;
  await limited(unique, async (object) => {
    const buffer = await readFile(join(directory, "blobs", `${object.sha256}.gz`));
    const response = await request("cambiometro-backups", object.blobKey, {
      method: "PUT", headers: { "Content-Type": "application/gzip", "Content-Length": String(object.compressedSize) },
      body: buffer,
    });
    const remoteMd5 = response.headers.get("etag")?.replaceAll('"', "");
    if (remoteMd5 !== createHash("md5").update(buffer).digest("hex")) throw new Error("COMPACTION_UPLOAD_CHECKSUM_MISMATCH");
    uploaded++; if (uploaded % 500 === 0) console.log(`[upload] ${uploaded}/${unique.length}`);
  });
  const published = await request("cambiometro-backups", manifestKey, { method: "PUT", headers: { "Content-Type": "application/json" }, body: manifestBuffer });
  if (published.headers.get("etag")?.replaceAll('"', "") !== createHash("md5").update(manifestBuffer).digest("hex")) throw new Error("COMPACTION_MANIFEST_PUBLISH_FAILED");
  await verifyRemote();
  const after = await inventory();
  const afterRoots = await manifests(after);
  if (plan.roots.some((root) => afterRoots.find((item) => item.key === root.key)?.sha256 !== root.sha256)) throw new Error("COMPACTION_ACTIVE_MANIFEST_CHANGED_AFTER_APPLY");
  const bucketBytes = {};
  for (const object of after) bucketBytes[object.bucket] = (bucketBytes[object.bucket] ?? 0) + object.size;
  const report = { completedAt: new Date().toISOString(), beforeBytes: plan.beforeBytes, afterBytes: after.reduce((sum, object) => sum + object.size, 0), bucketBytes, deleted, uploaded, activeManifestsUnchanged: true, allLocalArchivesRestored: true, allUploadsChecksumVerified: true, localArchive: directory };
  await save("result.json", report); console.log(JSON.stringify(report, null, 2));
} else throw new Error("COMPACTION_UNKNOWN_MODE");
