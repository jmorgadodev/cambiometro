import { describe, expect, it } from "vitest";
import { filterRecordsForRelease, inferReleaseCutoff, normalizeReleaseCutoff } from "./transfer-release-cutoff.mjs";

describe("transfer release cutoff", () => {
  it("keeps records registered on or before the declared cutoff", () => {
    const result = filterRecordsForRelease([
      { data: { id: "before", registered_at: "2026-08-20" } },
      { data: { id: "same-day", registered_at: "2026-08-20T23:59:59Z" } },
      { data: { id: "after", registered_at: "2026-08-21" } },
    ], { registeredThrough: "2026-08-20" });

    expect(result.records.map((record) => record.data.id)).toEqual(["before", "same-day"]);
    expect(result.excludedAfterCutoff).toBe(1);
    expect(result.missingRegisteredAt).toBe(0);
  });

  it("reports records without FECHA_INGRESO instead of treating them as current", () => {
    const result = filterRecordsForRelease([
      { data: { id: "missing" } },
    ], { registeredThrough: "2026-08-20" });

    expect(result.records).toHaveLength(1);
    expect(result.missingRegisteredAt).toBe(1);
  });

  it("rejects an invalid cutoff date", () => {
    expect(() => normalizeReleaseCutoff("2026-02-30")).toThrow("TRANSFER_RELEASE_CUTOFF_INVALID");
    expect(normalizeReleaseCutoff(undefined)).toBeNull();
  });

  it("infers the latest valid registration date for an automatic release", () => {
    expect(inferReleaseCutoff([
      { data: { registered_at: "2026-08-20" } },
      { data: { registered_at: "2026-08-24T12:00:00Z" } },
    ])).toBe("2026-08-24");
  });
});
