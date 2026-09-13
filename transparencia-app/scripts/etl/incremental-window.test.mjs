import { describe, expect, it } from "vitest";
import { resolveIncrementalFrom } from "./incremental-window.mjs";

describe("resolveIncrementalFrom", () => {
  const base = { requestedFrom: "2026-08-25", minimumFrom: "2026-03-11" };

  it("uses a bounded overlap after the latest published event", () => {
    expect(resolveIncrementalFrom({
      ...base,
      previousRecords: [{ fecha: "2026-08-28" }],
      overlapDays: 3,
    })).toBe("2026-08-25");
  });

  it("never moves before the official period minimum", () => {
    expect(resolveIncrementalFrom({
      requestedFrom: "2026-01-01",
      minimumFrom: "2026-03-11",
      previousRecords: [{ fecha: "2026-03-12" }],
      overlapDays: 7,
    })).toBe("2026-03-11");
  });

  it("falls back to the requested window when there is no prior snapshot", () => {
    expect(resolveIncrementalFrom({ ...base, previousRecords: [] })).toBe("2026-08-25");
  });
});

