function objectSize(object) {
  return Number.isFinite(Number(object?.size)) ? Number(object.size) : 0;
}

function asUtcDate(value) {
  if (value instanceof Date) return value.getTime();
  const text = String(value ?? "");
  const timestamp = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? Date.parse(`${text}T00:00:00Z`)
    : Date.parse(text);
  if (!Number.isFinite(timestamp)) throw new Error("INVALID_RETENTION_DATE");
  return timestamp;
}

export function getExpiredBackupObjects(objects, asOf, retentionWeeks) {
  if (!Number.isInteger(retentionWeeks) || retentionWeeks < 0) throw new Error("INVALID_RETENTION_WEEKS");
  const cutoff = asUtcDate(asOf) - retentionWeeks * 7 * 24 * 60 * 60 * 1000;
  return objects
    .filter((object) => {
      const match = String(object?.key ?? "").match(/^backup\/(\d{4}-\d{2}-\d{2})\//);
      if (!match) return false;
      const timestamp = Date.parse(`${match[1]}T00:00:00Z`);
      return Number.isFinite(timestamp) && timestamp < cutoff;
    })
    .sort((left, right) => String(left.key).localeCompare(String(right.key)));
}

export function projectedAccountBytes({ sourceObjects, backupObjects, expiredBackupObjects }) {
  const expiredKeys = new Set((expiredBackupObjects ?? []).map((object) => object.key));
  const sourceBytes = (sourceObjects ?? []).reduce((total, object) => total + objectSize(object), 0);
  const backupBytes = (backupObjects ?? []).reduce(
    (total, object) => total + (expiredKeys.has(object.key) ? 0 : objectSize(object)),
    0,
  );
  return sourceBytes + backupBytes;
}

/** @param {{ BACKUP_RETENTION_CONFIRM?: string }} environment */
export function retentionDeletionAuthorized(environment = process.env) {
  return environment.BACKUP_RETENTION_CONFIRM === "CAMBIOMETRO_R2_RETENTION_DELETE";
}
