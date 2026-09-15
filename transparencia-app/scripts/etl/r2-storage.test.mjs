import { describe, expect, it } from "vitest";
import { assertR2RetentionDeletionConfirmed, planR2Publication } from "./r2.mjs";
import { planR2Retention, summarizeR2Storage } from "./r2-storage.mjs";
import { defaultActiveProjectionManifests } from "../r2-active-manifests.mjs";

describe("protecciones de almacenamiento R2", () => {
  it("exige confirmación separada antes de eliminar objetos de retención", () => {
    expect(assertR2RetentionDeletionConfirmed([], false)).toBe(true);
    expect(() => assertR2RetentionDeletionConfirmed(["old/object.json"], false))
      .toThrow("R2_RETENTION_CONFIRMATION_REQUIRED");
    expect(assertR2RetentionDeletionConfirmed(["old/object.json"], true)).toBe(true);
  });

  it("declara las variantes públicas municipal y central como activas por defecto", () => {
    expect(defaultActiveProjectionManifests()).toEqual([
      {
        dataset: "funcionarios-v1",
        key: "projections/funcionarios-v1/manifest.json",
      },
      {
        dataset: "funcionarios-central-v1",
        key: "projections/funcionarios-central-v1/manifest.json",
      },
    ]);
  });

  it("bloquea crecimiento cuando el inventario supera el 95%", () => {
    const summary = summarizeR2Storage({
      limitBytes: 1_000,
      usedBytes: 955,
      objects: [{ key: "sources/current.json", size: 955, checksumSha256: "a" }],
    });
    expect(summary.status).toBe("growth-blocked");
    expect(summary.growthAllowed).toBe(false);
    expect(summary.freeBytes).toBe(45);
  });

  it("rechaza una publicación que aumentaría un inventario ya bloqueado", () => {
    expect(() => planR2Publication(
      [{ key: "sources/new.json", size: 50, checksumSha256: "new" }],
      { objects: [{ key: "sources/current.json", size: 955, checksumSha256: "old" }] },
      1_000,
    )).toThrow("R2_GROWTH_BLOCKED_AT_95_PERCENT");
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
      usedBytes: 950,
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
    expect(plan.projectedUsedBytesAfterAllCandidates).toBe(650);
    expect(plan.summary.growthAllowed).toBe(false);
  });

  it("expone releases sin manifiesto como candidatos no clasificados", () => {
    const plan = planR2Retention({
      limitBytes: 10_000,
      usedBytes: 9_000,
      objects: [
        { key: "projections/funcionarios-central-v1/versions/candidate/a.json", size: 4_000, checksumSha256: "a" },
      ],
    }, { activeVersions: { "funcionarios-v1": "active" } });

    expect(plan.candidates[0]).toMatchObject({
      dataset: "funcionarios-central-v1",
      version: "candidate",
      retentionStatus: "unclassified",
      deletionAllowed: false,
      requiresExplicitApproval: true,
    });
    expect(plan.candidates[0].reason).toContain("manifiesto");
    expect(plan.projectedUsedBytesAfterAllCandidates).toBe(5_000);
  });
});
