import { describe, expect, it } from "vitest";
import { assertR2WriteBudget, assessR2WriteBudget } from "./r2-write-guard.mjs";

describe("guardia de escritura R2", () => {
  it("calcula el tamaño final del conjunto de buckets y reemplazos", () => {
    const report = assessR2WriteBudget({
      currentObjects: [
        { bucket: "public", key: "old.json", size: 80 },
        { bucket: "backup", key: "snapshot.bin", size: 20 },
      ],
      puts: [{ bucket: "public", key: "old.json", size: 10 }],
      deletes: [],
      limitBytes: 100,
    });

    expect(report.currentBytes).toBe(100);
    expect(report.projectedBytes).toBe(30);
    expect(report.peakBytes).toBe(110);
  });

  it("bloquea antes de cualquier PUT si el pico o el resultado alcanza 95%", () => {
    expect(() => assertR2WriteBudget({
      currentObjects: [{ bucket: "public", key: "a", size: 90 }],
      puts: [{ bucket: "public", key: "b", size: 5 }],
      deletes: [],
      limitBytes: 100,
    })).toThrow("R2_WRITE_BLOCKED_AT_95_PERCENT");
  });

  it("permite una sustitución después de una eliminación que deja margen", () => {
    const report = assertR2WriteBudget({
      currentObjects: [
        { bucket: "public", key: "old", size: 80 },
        { bucket: "public", key: "keep", size: 5 },
      ],
      puts: [{ bucket: "public", key: "new", size: 10 }],
      deletes: [{ bucket: "public", key: "old" }],
      limitBytes: 100,
    });

    expect(report.projectedBytes).toBe(15);
    expect(report.peakBytes).toBe(15);
  });
});
