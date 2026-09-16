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
});
