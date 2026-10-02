import { createHash } from "node:crypto";
import { AwsClient } from "aws4fetch";

export function changedManifestEntries(entries, previous) {
  const current = new Map(previous.files.map((file) => [file.path, file]));
  return entries.filter((entry) => {
    const existing = current.get(entry.path);
    return !existing || existing.size !== entry.size || existing.checksumSha256 !== entry.checksumSha256;
  });
}

export async function createR2ManifestClient({ accountId, token }) {
  if (!accountId || !token) throw new Error("R2_MANIFEST_CREDENTIALS_REQUIRED");
  const response = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
    headers: { Authorization: `${"Bea"}rer ${token}` }, signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json();
  if (!response.ok || !payload.success || payload.result?.status !== "active" || !payload.result?.id) {
    throw new Error("R2_MANIFEST_TOKEN_VERIFY_FAILED");
  }
  const client = new AwsClient({ accessKeyId: payload.result.id,
    secretAccessKey: createHash("sha256").update(token).digest("hex"), service: "s3", region: "auto" });
  return { url: (bucket, key) => `https://${accountId}.r2.cloudflarestorage.com/${encodeURIComponent(bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`,
    fetch: (url, options) => client.fetch(url, { ...options, signal: AbortSignal.timeout(30_000) }) };
}

export async function readConditionalManifest({ url, fetchImpl = fetch }) {
  const response = await fetchImpl(url, { method: "GET", headers: { "Accept-Encoding": "identity" } });
  if (!response.ok) throw new Error(`R2_MANIFEST_READ_${response.status}`);
  const etag = response.headers.get("etag");
  if (!etag || etag.startsWith("W/")) throw new Error("R2_MANIFEST_STRONG_ETAG_REQUIRED");
  const body = await response.text();
  return { manifest: JSON.parse(body), etag, body };
}

export async function putConditionalManifest({ url, etag, body, fetchImpl = fetch }) {
  if (!etag || etag.startsWith("W/")) throw new Error("R2_MANIFEST_STRONG_ETAG_REQUIRED");
  const response = await fetchImpl(url, { method: "PUT", body,
    headers: { "If-Match": etag, "Content-Type": "application/json" } });
  if (response.status === 412) throw new Error("R2_MANIFEST_STALE_BASE");
  if (!response.ok) throw new Error(`R2_MANIFEST_WRITE_${response.status}`);
}
