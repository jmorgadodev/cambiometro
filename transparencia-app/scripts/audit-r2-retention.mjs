import { listR2Objects } from "../lib/r2-live-list.mjs";
import { buildR2RetentionReport } from "../lib/r2-retention-audit.mjs";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
const sourceBucket = process.env.R2_SOURCE_BUCKET || "transparencia-public-data";
const backupBucket = process.env.R2_BACKUP_BUCKET || "cambiometro-backups";
const retentionWeeks = Number(process.env.R2_RETENTION_WEEKS ?? 8);
const asOf = process.env.R2_RETENTION_AS_OF || new Date().toISOString().slice(0, 10);

if (!accountId || !token) throw new Error("R2_RETENTION_AUDIT_MISSING_CLOUDFLARE_CREDENTIALS");
if (!Number.isInteger(retentionWeeks) || retentionWeeks < 0) throw new Error("R2_RETENTION_AUDIT_INVALID_RETENTION_WEEKS");

const sourceObjects = await listR2Objects({ accountId, token, bucket: sourceBucket });
const backupObjects = await listR2Objects({ accountId, token, bucket: backupBucket });
const report = buildR2RetentionReport({ sourceObjects, backupObjects, asOf, retentionWeeks });
console.log(JSON.stringify({
  ...report,
  buckets: { source: sourceBucket, backups: backupBucket },
  operation: "read-only; no se ejecutan PUT ni DELETE",
}, null, 2));
