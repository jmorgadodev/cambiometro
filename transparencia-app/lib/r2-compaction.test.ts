import { describe, expect, it } from "vitest";
import { compactionCandidates, requireVerifiedArchive, mergeCompactObjects } from "./r2-compaction.mjs";

const manifests = [
  { key: "projections/funcionarios-v1/manifest.json", value: { version: "2026-09-15", assets: [{ key: "projections/funcionarios-v1/versions/2026-09-15/a.json" }] } },
  { key: "projections/static-site-v1/manifest.json", value: { datasets: [{ key: "projections/static-site-v1/releases/active/a.json" }] } },
];
const object = (key: string) => ({ key, size: 12, etag: "etag" });
describe("lossless R2 compaction", () => {
  it("retains older compact backups and rejects a conflicting identity", () => {
    const old = { bucket: "backups", key: "old", sha256: "a" };
    const newer = { bucket: "backups", key: "new", sha256: "b" };
    expect(mergeCompactObjects([old], [newer])).toEqual([old, newer]);
    expect(mergeCompactObjects([old], [old])).toEqual([old]);
    expect(() => mergeCompactObjects([old], [{ ...old, sha256: "changed" }])).toThrow("COMPACTION_ARCHIVE_IDENTITY_CONFLICT");
  });
  it("never selects active versions, future versions, unrelated projections or historical partitions", () => {
    const keys = ["projections/funcionarios-v1/versions/2026-09-02/a.json", "projections/funcionarios-v1/versions/2026-09-15/a.json", "projections/funcionarios-v1/versions/2026-10-01/a.json", "projections/static-site-v1/releases/active/a.json", "projections/static-site-v1/releases/old/a.json", "partitions/camara/2024/01/a.json", "projections/funcionarios-central-v1/versions/old/a.json"];
    const plan = compactionCandidates({ publicObjects: keys.map(object), backupObjects: [], manifests });
    expect(plan.candidates.map((item) => item.key)).toEqual([keys[0], keys[4]]);
  });
  it("protects a release referenced by another canonical manifest", () => {
    const key = "projections/static-site-v1/releases/old/a.json";
    const plan = compactionCandidates({ publicObjects: [object(key)], backupObjects: [], manifests: [...manifests, { key: "catalog/v1/manifest.json", value: { nested: { objectKey: key } } }] });
    expect(plan.candidates).toEqual([]);
  });
  it("only compacts known backup layouts and preserves existing compact blobs", () => {
    const keys = ["backup/2026-09-13/a.json", "d1/2026-09-06/db.sql.gz", "backup-inventory.json", "compact/v1/blobs/sha.gz", "manual/protected.json"];
    const plan = compactionCandidates({ publicObjects: [], backupObjects: keys.map(object), manifests });
    expect(plan.candidates.map((item) => item.key)).toEqual(keys.slice(0, 3));
  });
  it("requires a restored archive with the exact bucket, key, size and ETag before deletion", () => {
    const source = { bucket: "cambiometro-backups", ...object("backup/2026-09-13/a.json") };
    const archive = { ...source, sha256: "a".repeat(64), verified: true };
    expect(() => requireVerifiedArchive(source, archive)).not.toThrow();
    for (const patch of [{ size: 0 }, { bucket: "other" }, { verified: false }, { etag: "changed" }, { sha256: "invalid" }]) {
      expect(() => requireVerifiedArchive(source, { ...archive, ...patch })).toThrow("COMPACTION_ARCHIVE_NOT_VERIFIED");
    }
  });
  it("fails closed if the active manifest is missing", () => {
    expect(() => compactionCandidates({ publicObjects: [], backupObjects: [], manifests: [] })).toThrow("COMPACTION_ACTIVE_MANIFEST_REQUIRED");
  });
});
