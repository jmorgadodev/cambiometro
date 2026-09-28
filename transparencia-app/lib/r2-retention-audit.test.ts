import { describe, expect, it } from "vitest";
import { buildR2RetentionReport } from "./r2-retention-audit.mjs";

describe("auditoría de retención R2", () => {
  it("resume candidatos por snapshot sin incluir objetos D1", () => {
    const report = buildR2RetentionReport({
      asOf: "2026-09-16",
      retentionWeeks: 8,
      sourceObjects: [{ key: "a", size: 1000 }],
      backupObjects: [
        { key: "backup/2026-01-01/a", size: 200 },
        { key: "backup/2026-08-20/a", size: 300 },
        { key: "backup/2026-09-13/a", size: 400 },
        { key: "d1/2026-01-01/db.sql.gz", size: 500 },
      ],
    });

    expect(report.backups.candidates).toEqual({ objects: 1, bytes: 200 });
    expect(report.backups.snapshots).toEqual([{ snapshot: "2026-01-01", objects: 1, bytes: 200 }]);
    expect(report.safety).toMatchObject({ deletesPerformed: false, deletionAllowed: false });
  });

  it("reconcilia el manifiesto compactado contra blobs presentes sin marcarlo expirado", () => {
    const manifest = {
      format: "gzip-sha256-v1",
      createdAt: "2026-09-17T04:34:44.469Z",
      objects: [
        { bucket: "transparencia-public-data", key: "old/a.json", blobKey: "compact/v1/blobs/shared.gz", size: 120, compressedSize: 40, sha256: "a".repeat(64), verified: true },
        { bucket: "transparencia-public-data", key: "old/b.json", blobKey: "compact/v1/blobs/shared.gz", size: 80, compressedSize: 40, sha256: "a".repeat(64), verified: true },
        { bucket: "transparencia-public-data", key: "old/c.json", blobKey: "compact/v1/blobs/missing.gz", size: 30, compressedSize: 10, sha256: "b".repeat(64), verified: true },
      ],
    };
    const report = buildR2RetentionReport({
      asOf: "2026-09-28",
      compactManifest: manifest,
      backupObjects: [
        { key: "compact/v1/manifest.json", size: 100 },
        { key: "compact/v1/blobs/shared.gz", size: 40 },
        { key: "compact/v1/blobs/orphan.gz", size: 12 },
      ],
    });

    expect(report.backups.compactArchive).toMatchObject({
      status: "integrity_mismatch",
      referenceCount: 3,
      uniqueBlobCount: 2,
      archiveVerifiedReferences: 3,
      representedRawBytes: 230,
      referencedCompressedBytes: 50,
      presentBlobCount: 1,
      missingBlobCount: 1,
      orphanBlobCount: 1,
    });
    expect(report.backups.candidates).toEqual({ objects: 0, bytes: 0 });
    expect(report.safety).toMatchObject({ deletesPerformed: false, deletionAllowed: false });
  });

  it("expone claramente cuando no se pudo leer el manifiesto compacto", () => {
    const report = buildR2RetentionReport({
      asOf: "2026-09-28",
      compactManifest: null,
      backupObjects: [{ key: "compact/v1/blobs/unclassified.gz", size: 50 }],
    });

    expect(report.backups.compactArchive).toMatchObject({
      status: "manifest_unavailable",
      referenceCount: 0,
      uniqueBlobCount: 0,
      missingBlobCount: 0,
      orphanBlobCount: 1,
    });
  });

  it("marca como conciliado el archivo cuando manifiesto y blobs coinciden", () => {
    const manifest = {
      format: "gzip-sha256-v1",
      createdAt: "2026-09-17T04:34:44.469Z",
      objects: [{
        bucket: "transparencia-public-data",
        key: "old/a.json",
        blobKey: "compact/v1/blobs/a.gz",
        size: 120,
        compressedSize: 40,
        sha256: "a".repeat(64),
        verified: true,
      }],
    };
    const report = buildR2RetentionReport({
      asOf: "2026-09-28",
      compactManifest: manifest,
      backupObjects: [
        { key: "compact/v1/manifest.json", size: 100 },
        { key: "compact/v1/blobs/a.gz", size: 40 },
      ],
    });

    expect(report.backups.compactArchive).toMatchObject({
      status: "inventory_reconciled",
      referenceCount: 1,
      uniqueBlobCount: 1,
      archiveVerifiedReferences: 1,
      presentBlobCount: 1,
      missingBlobCount: 0,
      orphanBlobCount: 0,
      sizeMismatchBlobCount: 0,
      invalidReferenceCount: 0,
    });
  });

  it("no considera completa una referencia compacta sin identidad de origen", () => {
    const report = buildR2RetentionReport({
      asOf: "2026-09-28",
      compactManifest: {
        format: "gzip-sha256-v1",
        objects: [{ blobKey: "compact/v1/blobs/a.gz", compressedSize: 40, sha256: "a".repeat(64), verified: true }],
      },
      backupObjects: [
        { key: "compact/v1/manifest.json", size: 100 },
        { key: "compact/v1/blobs/a.gz", size: 40 },
      ],
    });

    expect(report.backups.compactArchive).toMatchObject({
      status: "integrity_mismatch",
      invalidReferenceCount: 1,
    });
  });
});
