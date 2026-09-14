import { describe, expect, it } from "vitest";
import { summarizeR2Storage } from "../scripts/etl/r2-storage.mjs";

describe("auditoría de almacenamiento R2", () => {
  it("calcula margen, prefijos y duplicados potenciales", () => {
    const summary = summarizeR2Storage({
      limitBytes: 1_000,
      usedBytes: 850,
      objects: [
        { key: "projections/a.json", size: 500, checksumSha256: "same" },
        { key: "projections/b.json", size: 200, checksumSha256: "same" },
        { key: "partitions/a.json", size: 150, checksumSha256: "other" },
      ],
    });
    expect(summary.status).toBe("archive-review");
    expect(summary.growthAllowed).toBe(true);
    expect(summary.freeBytes).toBe(150);
    expect(summary.computedBytes).toBe(850);
    expect(summary.duplicateBytes).toBe(200);
    expect(summary.byPrefix[0]).toMatchObject({ prefix: "projections", bytes: 700 });
  });

  it("bloquea crecimiento desde el umbral crítico", () => {
    const summary = summarizeR2Storage({
      limitBytes: 1_000,
      usedBytes: 900,
      objects: [{ key: "a", size: 900, checksumSha256: "a" }],
    });
    expect(summary.status).toBe("growth-blocked");
    expect(summary.growthAllowed).toBe(false);
  });

  it("detecta una diferencia entre el contador declarado y los objetos", () => {
    const summary = summarizeR2Storage({
      limitBytes: 1_000,
      usedBytes: 700,
      objects: [{ key: "a", size: 600, checksumSha256: "a" }],
    });
    expect(summary.accountingDeltaBytes).toBe(100);
  });
});
