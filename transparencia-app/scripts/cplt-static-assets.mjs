const cpltStaticAssetPattern = /^projections\/funcionarios-v1\/versions\/[A-Za-z0-9._-]+\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.json(?:\.gz)?$/;

import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

export function restoreCpltOriginalAsset(data,asset) {
  if (asset.encoding!=="gzip") return data;
  const raw=gunzipSync(data);
  if (!Number.isSafeInteger(asset.originalSize) || raw.length!==asset.originalSize
    || createHash("sha256").update(raw).digest("hex")!==asset.originalChecksumSha256) throw new Error("CPLT_ORIGINAL_RESTORE_CHECKSUM");
  return raw;
}

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
