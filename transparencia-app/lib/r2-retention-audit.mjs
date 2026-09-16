import { getExpiredBackupObjects } from "./backup-retention.mjs";

function bytes(objects) {
  return objects.reduce((total, object) => total + (Number.isFinite(Number(object?.size)) ? Number(object.size) : 0), 0);
}

function snapshotDate(key) {
  const match = String(key ?? "").match(/^backup\/(\d{4}-\d{2}-\d{2})\//);
  return match?.[1] ?? null;
}

/**
 * Produces a read-only retention report. It intentionally does not decide or
 * perform deletions: a snapshot is only a candidate until a verified rollback
 * exists for every release it contains.
 */
export function buildR2RetentionReport({ sourceObjects = [], backupObjects = [], asOf, retentionWeeks = 8 } = {}) {
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
    },
    safety: {
      deletesPerformed: false,
      deletionAllowed: false,
      reason: "Cada candidato requiere rollback completo verificable y aprobación explícita antes de eliminarse.",
    },
  };
}
