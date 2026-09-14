import { describe, expect, it } from "vitest";
import { compareR2Catalogs } from "../scripts/audit-r2-catalog.mjs";

describe("auditoría acotada del catálogo R2", () => {
  it("distingue variantes remotas que faltan en el catálogo local", () => {
    const report = compareR2Catalogs(
      {
        generatedAt: null,
        sources: [{ id: "camara", recordCount: 58_751, status: "partial", foundPeriods: ["2026-09"] }],
        partitions: [
          { sourceId: "camara", variant: "asistencia_camara", period: "2026-09", recordCount: 775 },
          { sourceId: "camara", variant: "votaciones_camara", period: "2026-09", recordCount: 49 },
        ],
      },
      {
        generatedAt: "2026-08-21T00:00:00Z",
        sources: [{ id: "camara", recordCount: 2_750, status: "partial", foundPeriods: ["2026-08"] }],
        partitions: [{ sourceId: "camara", period: "2026-08", recordCount: 2_750 }],
      },
    );

    expect(report.summary.alcance).toBe(1);
    const row = report.rows[0];
    expect(row).toBeDefined();
    expect(row).toMatchObject({ id: "camara", classification: "alcance", deltaRecords: 56_001 });
    expect(row.remote?.variants).toHaveProperty("asistencia_camara");
    expect(row.local?.variants).toHaveProperty("base");
  });

  it("marca una fuente idéntica sin convertir el manifiesto en datos", () => {
    const manifest = {
      generatedAt: "2026-09-01T00:00:00Z",
      sources: [{ id: "senado", recordCount: 10, status: "partial", foundPeriods: ["2026-09"] }],
      partitions: [{ sourceId: "senado", period: "2026-09", recordCount: 10 }],
    };
    const report = compareR2Catalogs(manifest, manifest);
    expect(report.summary.coincide).toBe(1);
    expect(report.rows[0]?.remote).not.toHaveProperty("records");
  });
});
