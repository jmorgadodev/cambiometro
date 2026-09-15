import { describe, expect, it } from "vitest";
import { planR2Publication } from "./r2.mjs";
import { planR2Retention, summarizeR2Storage } from "./r2-storage.mjs";

describe("protecciones de almacenamiento R2", () => {
  it("bloquea crecimiento cuando el inventario supera el 90%", () => {
    const summary = summarizeR2Storage({
      limitBytes: 1_000,
      usedBytes: 905,
      objects: [{ key: "sources/current.json", size: 905, checksumSha256: "a" }],
    });
    expect(summary.status).toBe("growth-blocked");
    expect(summary.growthAllowed).toBe(false);
    expect(summary.freeBytes).toBe(95);
  });

  it("rechaza una publicación que aumentaría un inventario ya bloqueado", () => {
    expect(() => planR2Publication(
      [{ key: "sources/new.json", size: 50, checksumSha256: "new" }],
      { objects: [{ key: "sources/current.json", size: 905, checksumSha256: "old" }] },
      1_000,
    )).toThrow("R2_GROWTH_BLOCKED_AT_90_PERCENT");
  });

  it("identifica duplicados como oportunidad, sin decidir eliminaciones", () => {
    const summary = summarizeR2Storage({
      limitBytes: 1_000,
      objects: [
        { key: "sources/a.json", size: 100, checksumSha256: "same" },
        { key: "sources/b.json", size: 100, checksumSha256: "same" },
      ],
    });
    expect(summary.duplicateChecksumGroups).toBe(1);
    expect(summary.duplicateBytes).toBe(100);
    expect(summary.duplicateGroups[0]).toMatchObject({
      count: 2,
      reclaimableBytes: 100,
      keys: ["sources/a.json", "sources/b.json"],
      referenceStatus: "unknown",
      referencedKeys: [],
    });
    expect(summary).not.toHaveProperty("deletes");
  });

  it("clasifica duplicados sólo con el conjunto explícito de referencias", () => {
    const summary = summarizeR2Storage({
      limitBytes: 1_000,
      objects: [
        { key: "sources/a.json", size: 100, checksumSha256: "same" },
        { key: "sources/b.json", size: 100, checksumSha256: "same" },
      ],
    }, { referencedKeys: ["sources/b.json"] });
    expect(summary.duplicateGroups[0]).toMatchObject({ referenceStatus: "referenced", referencedKeys: ["sources/b.json"] });

    const unreferenced = summarizeR2Storage({
      limitBytes: 1_000,
      objects: [
        { key: "sources/a.json", size: 100, checksumSha256: "same" },
        { key: "sources/b.json", size: 100, checksumSha256: "same" },
      ],
    }, { referencedKeys: ["sources/other.json"] });
    expect(unreferenced.duplicateGroups[0].referenceStatus).toBe("unreferenced-by-supplied-set");
  });

  it("propone versiones históricas en seco sin autorizar eliminaciones", () => {
    const plan = planR2Retention({
      limitBytes: 1_000,
      usedBytes: 900,
      objects: [
        { key: "projections/funcionarios-v1/versions/current/a.json", size: 600, checksumSha256: "a" },
        { key: "projections/funcionarios-v1/versions/old/a.json", size: 300, checksumSha256: "b" },
      ],
    }, { activeVersions: { "funcionarios-v1": "current" } });

    expect(plan.dryRun).toBe(true);
    expect(plan.candidates[0]).toMatchObject({
      dataset: "funcionarios-v1",
      version: "old",
      bytes: 300,
      deletionAllowed: false,
      requiresExplicitApproval: true,
    });
    expect(plan.projectedUsedBytesAfterAllCandidates).toBe(600);
    expect(plan.summary.growthAllowed).toBe(false);
  });
});
