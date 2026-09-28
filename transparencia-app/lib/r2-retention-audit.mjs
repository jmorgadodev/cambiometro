import { getExpiredBackupObjects } from "./backup-retention.mjs";

/** @typedef {{ key?: string, size?: number }} R2Object */
/** @typedef {{ bucket?: string, key?: string, blobKey?: string, size?: number, compressedSize?: number, sha256?: string, verified?: boolean }} CompactArchiveReference */
/** @typedef {{ format?: string, createdAt?: string, objects?: CompactArchiveReference[] } | null} CompactArchiveManifest */

/** @param {R2Object[]} objects */
function bytes(objects) {
  return objects.reduce((total, object) => total + (Number.isFinite(Number(object?.size)) ? Number(object.size) : 0), 0);
}

function snapshotDate(key) {
  const match = String(key ?? "").match(/^backup\/(\d{4}-\d{2}-\d{2})\//);
  return match?.[1] ?? null;
}

function summarizeCompactArchive(manifest, backupObjects) {
  const blobObjects = backupObjects.filter((object) => String(object.key ?? "").startsWith("compact/v1/blobs/"));
  const presentBlobKeys = new Set(blobObjects.map((object) => object.key));
  const manifestAvailable = manifest !== null && manifest !== undefined;
  const validManifest = manifestAvailable && manifest.format === "gzip-sha256-v1"
    && Array.isArray(manifest.objects) && manifest.objects.length > 0;
  const references = validManifest ? manifest.objects : [];
  const uniqueReferences = new Map();
  let conflictingBlobMetadataCount = 0;
  const invalidReferenceCount = references.filter((reference) => !reference?.bucket
    || !reference?.key
    || !reference?.blobKey
    || !String(reference.blobKey).startsWith("compact/v1/blobs/")
    || !Number.isFinite(Number(reference.compressedSize))
    || !/^[a-f0-9]{64}$/i.test(String(reference.sha256 ?? ""))).length;
  for (const reference of references) {
    if (!reference?.blobKey) continue;
    const previous = uniqueReferences.get(reference.blobKey);
    if (previous && (previous.compressedSize !== reference.compressedSize || previous.sha256 !== reference.sha256)) {
      conflictingBlobMetadataCount += 1;
    } else if (!previous) {
      uniqueReferences.set(reference.blobKey, reference);
    }
  }
  const referencedBlobKeys = new Set(uniqueReferences.keys());
  const missingBlobKeys = [...referencedBlobKeys].filter((key) => !presentBlobKeys.has(key));
  const orphanBlobObjects = blobObjects.filter((object) => !referencedBlobKeys.has(object.key));
  const blobSizeByKey = new Map(blobObjects.map((object) => [object.key, Number(object.size)]));
  const sizeMismatchBlobCount = [...uniqueReferences.values()].filter((reference) => {
    const objectSize = blobSizeByKey.get(reference.blobKey);
    return objectSize !== undefined && objectSize !== Number(reference.compressedSize);
  }).length;
  const manifestObjectPresent = backupObjects.some((object) => object.key === "compact/v1/manifest.json");
  const archiveVerifiedReferences = references.filter((reference) => reference.verified === true).length;
  const hasIntegrityMismatch = !manifestObjectPresent
    || missingBlobKeys.length > 0
    || orphanBlobObjects.length > 0
    || sizeMismatchBlobCount > 0
    || conflictingBlobMetadataCount > 0
    || invalidReferenceCount > 0
    || archiveVerifiedReferences !== references.length;

  return {
    status: !manifestAvailable ? "manifest_unavailable"
      : !validManifest ? "manifest_invalid"
        : hasIntegrityMismatch ? "integrity_mismatch" : "inventory_reconciled",
    manifestKey: "compact/v1/manifest.json",
    manifestObjectPresent,
    createdAt: manifest?.createdAt ?? null,
    referenceCount: references.length,
    uniqueBlobCount: referencedBlobKeys.size,
    archiveVerifiedReferences,
    representedRawBytes: references.reduce((total, reference) => total + (Number(reference.size) || 0), 0),
    referencedCompressedBytes: [...uniqueReferences.values()].reduce((total, reference) => total + (Number(reference.compressedSize) || 0), 0),
    presentBlobCount: [...referencedBlobKeys].filter((key) => presentBlobKeys.has(key)).length,
    missingBlobCount: missingBlobKeys.length,
    orphanBlobCount: orphanBlobObjects.length,
    orphanBlobBytes: bytes(orphanBlobObjects),
    sizeMismatchBlobCount,
    conflictingBlobMetadataCount,
    invalidReferenceCount,
  };
}

/**
 * Produces a read-only retention report. It intentionally does not decide or
 * perform deletions: a snapshot is only a candidate until a verified rollback
 * exists for every release it contains.
 * @param {{ sourceObjects?: R2Object[], backupObjects?: R2Object[], compactManifest?: CompactArchiveManifest, asOf: string, retentionWeeks?: number }} options
 */
export function buildR2RetentionReport({ sourceObjects = [], backupObjects = [], compactManifest = null, asOf, retentionWeeks = 8 } = {}) {
  const expired = getExpiredBackupObjects(backupObjects, asOf, retentionWeeks);
  const bySnapshot = new Map();
  for (const object of expired) {
    const date = snapshotDate(object.key) ?? "unknown";
    const current = bySnapshot.get(date) ?? { snapshot: date, objects: 0, bytes: 0 };
    current.objects += 1;
    current.bytes += Number.isFinite(Number(object.size)) ? Number(object.size) : 0;
    bySnapshot.set(date, current);
  }

  const sourceBytes = bytes(sourceObjects);
  const backupBytes = bytes(backupObjects);
  const candidateBytes = bytes(expired);
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    asOf,
    retentionWeeks,
    source: { objects: sourceObjects.length, bytes: sourceBytes },
    backups: {
      objects: backupObjects.length,
      bytes: backupBytes,
      candidates: { objects: expired.length, bytes: candidateBytes },
      protectedAfterRetention: { objects: backupObjects.length - expired.length, bytes: backupBytes - candidateBytes },
      snapshots: [...bySnapshot.values()].sort((left, right) => left.snapshot.localeCompare(right.snapshot)),
      compactArchive: summarizeCompactArchive(compactManifest, backupObjects),
    },
    safety: {
      deletesPerformed: false,
      deletionAllowed: false,
      reason: "Cada candidato requiere rollback completo verificable y aprobación explícita antes de eliminarse.",
    },
  };
}
