import { describe, expect, it } from "vitest";
import { planR2Publication } from "./r2.mjs";
import { summarizeR2Storage } from "./r2-storage.mjs";

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
    expect(summary).not.toHaveProperty("deletes");
  });
});

