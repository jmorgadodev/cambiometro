import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";

const sha256 = (data) => createHash("sha256").update(data).digest("hex");

export function compressCpltProjection(key, raw) {
  const data = gzipSync(raw, { level: 9 });
  const metadata = {
    key: `${key}.gz`, size: data.length, checksumSha256: sha256(data), encoding: "gzip",
    originalSize: raw.length, originalChecksumSha256: sha256(raw),
  };
  // Verify the exact original bytes, not a reserialized approximation.
  decodeCpltStaticAsset(metadata, data);
  return { data, metadata };
}

export function decodeCpltStaticAsset(asset, content) {
  if (content.length !== asset.size || sha256(content) !== asset.checksumSha256) {
    throw new Error(`CPLT_STATIC_CHECKSUM_MISMATCH:${asset.key}`);
  }
  if (!asset.key.endsWith(".json.gz")) return content;
  if (asset.encoding !== "gzip" || !Number.isSafeInteger(asset.originalSize)
    || asset.originalSize < 2 || asset.originalSize > 512 * 1024 * 1024
    || !/^[a-f0-9]{64}$/i.test(asset.originalChecksumSha256 ?? "")) {
    throw new Error(`CPLT_STATIC_GZIP_METADATA_INVALID:${asset.key}`);
  }
  const raw = gunzipSync(content, { maxOutputLength: asset.originalSize });
  if (raw.length !== asset.originalSize || sha256(raw) !== asset.originalChecksumSha256) {
    throw new Error(`CPLT_STATIC_ORIGINAL_CHECKSUM_MISMATCH:${asset.key}`);
  }
  return raw;
}

const cpltStaticAssetPattern = /^projections\/funcionarios-v1\/versions\/[A-Za-z0-9._-]+\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.json(?:\.gz)?$/;

export function cpltStaticAssetRelativePath(key, version) {
  const versionPrefix = `projections/funcionarios-v1/versions/${version}/`;
  const relativePath = typeof key === "string" && key.startsWith(versionPrefix)
    ? key.slice(versionPrefix.length)
    : null;
  const segments = relativePath?.split("/") ?? [];
  const safeSegments = segments.length > 0 && segments.every((segment) => (
    segment.length > 0
    && segment !== "."
    && segment !== ".."
    && /^[A-Za-z0-9._-]+$/.test(segment)
  ));

  if (!relativePath || !cpltStaticAssetPattern.test(key) || !safeSegments) {
    throw new Error(`CPLT_STATIC_ASSET_KEY_INVALID:${key}`);
  }
  return relativePath;
}

export function cpltStaticAssetsForPages(assets) {
  return assets.filter((asset) => !asset.key.includes("/search_index/"));
}
