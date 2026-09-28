import { describe, expect, it } from "vitest";
import { reconcileR2Inventory, summarizeR2Inventory } from "./r2-inventory-audit.mjs";

describe("summarizeR2Inventory", () => {
  it("calcula uso, versiones y duplicados sin confundir rollback con duplicado", () => {
    const report = summarizeR2Inventory({
      limitBytes: 1000,
      usedBytes: 650,
      objects: [
        { key: "projections/funcionarios-v1/versions/old/data.json", size: 300, checksumSha256: "old" },
        { key: "projections/funcionarios-v1/versions/new/data.json", size: 300, checksumSha256: "new" },
        { key: "indexes/a.json", size: 25, checksumSha256: "same" },
        { key: "indexes/b.json", size: 25, checksumSha256: "same" },
      ],
    });

    expect(report).toMatchObject({ usedBytes: 650, limitBytes: 1000, ratio: 0.65, status: "ok", objectCount: 4 });
    expect(report.datasets[0]).toMatchObject({ dataset: "funcionarios-v1", versionCount: 2, bytes: 600 });
    expect(report.duplicateChecksumGroups).toEqual([{ checksum: "same", count: 2, bytes: 50 }]);
  });

  it("marca revisión al 90% y bloqueo al 95%", () => {
    expect(summarizeR2Inventory({ limitBytes: 1000, usedBytes: 900, objects: [] }).status).toBe("review");
    expect(summarizeR2Inventory({ limitBytes: 1000, usedBytes: 950, objects: [] }).status).toBe("blocked");
  });
});

describe("reconcileR2Inventory", () => {
  it("cuantifica altas, faltantes y cambios de tamaño por prefijo sin exponer claves", () => {
    const report = reconcileR2Inventory({
      cachedObjects: [
        { key: "indexes/v1/old.json", size: 100 },
        { key: "projections/funcionarios-v1/a.json", size: 200 },
      ],
      liveObjects: [
        { key: "indexes/v1/old.json", size: 120 },
        { key: "projections/funcionarios-v1/b.json", size: 300 },
        { key: "catalog/v1/new.json", size: 50 },
      ],
    });

    expect(report).toMatchObject({
      cachedObjectCount: 2,
      liveObjectCount: 3,
      liveOnly: {
        count: 2,
        bytes: 350,
        byPrefix: [
          { prefix: "projections/funcionarios-v1", count: 1, bytes: 300 },
          { prefix: "catalog/v1", count: 1, bytes: 50 },
        ],
      },
      cachedOnly: {
        count: 1,
        bytes: 200,
        byPrefix: [{ prefix: "projections/funcionarios-v1", count: 1, bytes: 200 }],
      },
      changedSize: {
        count: 1,
        cachedBytes: 100,
        liveBytes: 120,
        deltaBytes: 20,
        byPrefix: [{ prefix: "indexes/v1", count: 1, deltaBytes: 20 }],
      },
    });
    expect(JSON.stringify(report)).not.toContain("old.json");
  });
});
