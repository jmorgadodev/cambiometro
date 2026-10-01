import { assertStaticInputManifest, STATIC_SITE_FILE_GROUPS, sha256Buffer, sha256Json } from "./static-site-inputs.mjs";

// Pure local contract. Remote compare-and-swap and Pages integration are
// deliberately not enabled by importing this module.
export function buildReleaseSet(manifest) {
  assertStaticInputManifest(manifest);
  const { checksumSha256, ...body } = manifest;
  if (sha256Json(body) !== checksumSha256) throw new Error("RELEASE_SET_MANIFEST_CHECKSUM");
  const domains = {};
  for (const [id, paths] of Object.entries(STATIC_SITE_FILE_GROUPS).sort()) {
    const files = manifest.files.filter((file) => paths.includes(file.path)
      || (id === "gastos" && file.path.startsWith("data/lake-subsets/expense-periods/")))
      .map((file) => ({
        path: file.path, key: file.key, checksumSha256: file.checksumSha256,
        size: file.size, recordCount: file.recordCount ?? null,
        period: file.period ?? null,
      })).sort((a, b) => a.path.localeCompare(b.path));
    if (files.length) domains[id] = { releaseId: sha256Json(files), files };
  }
  const set = {
    schemaVersion: 1, scope: "static-site-inputs",
    manifestChecksumSha256: checksumSha256, domains,
  };
  return { ...set, releaseSetId: sha256Json(set) };
}

function assertReleaseSet(set) {
  if (!set || set.schemaVersion !== 1 || set.scope !== "static-site-inputs") throw new Error("RELEASE_SET_INVALID");
  const { releaseSetId, ...body } = set;
  if (sha256Json(body) !== releaseSetId) throw new Error("RELEASE_SET_CHECKSUM");
  for (const domain of Object.values(set.domains)) {
    if (!Array.isArray(domain.files) || domain.files.length === 0
      || sha256Json(domain.files) !== domain.releaseId) throw new Error("RELEASE_SET_DOMAIN_CHECKSUM");
  }
  return set;
}

export function assertPinnedReleaseSet(set, manifest) {
  assertReleaseSet(set);
  if (buildReleaseSet(manifest).releaseSetId !== set.releaseSetId) throw new Error("RELEASE_SET_PIN_MISMATCH");
  return set;
}

export function assertReleaseSetArtifacts(set, manifest, readArtifact) {
  assertPinnedReleaseSet(set, manifest);
  for (const file of manifest.files) {
    const bytes = readArtifact(file.path);
    if (bytes.byteLength !== file.size || sha256Buffer(bytes) !== file.checksumSha256) {
      throw new Error(`RELEASE_SET_ARTIFACT_MISMATCH:${file.path}`);
    }
  }
  return set;
}

export function assertReleaseSetPromotion(current, candidate, expectedCurrentId) {
  assertReleaseSet(current);
  assertReleaseSet(candidate);
  if (current.releaseSetId !== expectedCurrentId) throw new Error("RELEASE_SET_STALE_BASE");
  return candidate;
}
