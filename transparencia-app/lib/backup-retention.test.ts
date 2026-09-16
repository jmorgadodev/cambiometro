import { describe, expect, it } from "vitest";
import { getExpiredBackupObjects, projectedAccountBytes } from "./backup-retention.mjs";

describe("backup retention", () => {
  it("detecta sólo snapshots backup antiguos y no confunde objetos D1", () => {
    const objects = [
      { key: "backup/2026-01-01/catalog.json", size: 100 },
      { key: "backup/2026-08-20/catalog.json", size: 200 },
      { key: "backup/2026-09-13/catalog.json", size: 300 },
      { key: "d1/2026-01-01/transparencia-db.sql.gz", size: 400 },
      { key: "backup/not-a-date/file", size: 500 },
    ];

    expect(getExpiredBackupObjects(objects, "2026-09-16", 8)).toEqual([
      objects[0],
    ]);
  });

  it("proyecta la cuenta descontando snapshots que se eliminarán antes de copiar", () => {
    expect(projectedAccountBytes({
      sourceObjects: [{ key: "a", size: 900 }],
      backupObjects: [{ key: "backup/2026-01-01/a", size: 500 }, { key: "backup/2026-09-13/a", size: 200 }],
      expiredBackupObjects: [{ key: "backup/2026-01-01/a", size: 500 }],
    })).toBe(1_100);
  });
});
