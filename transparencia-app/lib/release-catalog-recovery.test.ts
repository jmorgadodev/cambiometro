import { describe, expect, it } from "vitest";
import { reconcileReleaseCatalog } from "../scripts/etl/reconcile-release-catalog.mjs";

describe("reconciliacion manual de catalogos legacy", () => {
  it("recalcula particiones y fuentes desde manifiestos actuales", () => {
    const catalog = {
      schemaVersion: "1.0.0",
      generatedAt: "2026-08-09T00:00:00.000Z",
      partitions: [{ id: "camara/2026/08", sourceId: "camara", period: "2026-08", recordCount: 185, checksumSha256: "old", status: "partial" }],
      sources: [{ id: "camara", recordCount: 185, foundPeriods: ["2026-08"], status: "partial", error: null }],
    };
    const manifests = new Map([["camara/2026/08", {
      id: "camara/2026/08",
      sourceId: "camara",
      generatedAt: "2026-08-11T09:00:00.000Z",
      recordCount: 337,
      projectionChecksumSha256: "new",
      status: "partial",
    }]]);
    const result = reconcileReleaseCatalog(catalog, manifests);
    expect(result.catalog.partitions[0]).toMatchObject({ recordCount: 337, checksumSha256: "new" });
    expect(result.catalog.sources[0]).toMatchObject({ recordCount: 337, foundPeriods: ["2026-08"] });
    expect(result.report.changedPartitions).toHaveLength(1);
  });

  it("falla si el manifiesto no corresponde a la particion", () => {
    const catalog = { partitions: [{ id: "camara/2026/08", sourceId: "camara" }], sources: [] };
    const manifests = new Map([["camara/2026/08", { id: "otra", sourceId: "camara", recordCount: 1, projectionChecksumSha256: "x" }]]);
    expect(() => reconcileReleaseCatalog(catalog, manifests)).toThrow("RECOVERY_MANIFEST_ID_MISMATCH");
  });
});
