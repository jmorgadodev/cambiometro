import { describe, expect, it } from "vitest";
import { buildR2History, buildR2HistoryFromManifests } from "./r2-history.mjs";

const base = {
  releaseId: "release-",
  checksum: "checksum-",
  publishedAt: "2026-09-14T00:00:00Z",
};

describe("buildR2History", () => {
  it("requires release metadata before comparing records", () => {
    expect(() => buildR2History([{ period: "2026-01", records: [] }], { keyFields: ["personKey"] }))
      .toThrow("sin releaseId");
  });

  it("detects additions, removals, amount changes and organization changes", () => {
    const result = buildR2History([
      {
        ...base,
        period: "2026-01",
        releaseId: "release-01",
        checksum: "checksum-01",
        records: [
          { personKey: "a", organismo: "Interior", montoBruto: 100 },
          { personKey: "b", organismo: "Salud", montoBruto: 200 },
        ],
      },
      {
        ...base,
        period: "2026-02",
        releaseId: "release-02",
        checksum: "checksum-02",
        records: [
          { personKey: "a", organismo: "Presidencia", montoBruto: 150 },
          { personKey: "c", organismo: "Interior", montoBruto: 300 },
        ],
      },
    ], { keyFields: ["personKey"] });

    const comparison = result.comparisons[0];
    expect(comparison.added.map((item) => item.key)).toEqual(["c"]);
    expect(comparison.removed.map((item) => item.key)).toEqual(["b"]);
    expect(comparison.amountChanges[0]).toMatchObject({ key: "a", amountBefore: 100, amountAfter: 150, difference: 50 });
    expect(comparison.organizationChanges[0]).toMatchObject({ key: "a", organizationBefore: "Interior", organizationAfter: "Presidencia" });
  });

  it("rejects duplicate identities instead of overwriting source rows", () => {
    expect(() => buildR2History([{
      ...base,
      period: "2026-01",
      records: [{ personKey: "a" }, { personKey: "a" }],
    }], { keyFields: ["personKey"] })).toThrow("clave duplicada");
  });

  it("keeps original records and flags fallback identities", () => {
    const input = {
      ...base,
      period: "2026-01",
      records: [{ recordId: "row-1", nombre: "Ana Pérez", monto: "1.250.000" }],
    };
    const result = buildR2History([input], { keyFields: ["personKey"] });
    const row = result.historyByKey["record-id|row-1"][0];
    expect(result.periods[0].fallbackKeys).toBe(1);
    expect(row.keyQuality).toBe("fallback-record-id");
    expect(row.original).toEqual(input.records[0]);
    expect(input.records[0]).toEqual({ recordId: "row-1", nombre: "Ana Pérez", monto: "1.250.000" });
  });

  it("reads only declared R2 pages and validates page and release totals", async () => {
    const requested = [];
    const objects = new Map([
      ["r2/2026-01/page-1.json", [{ personKey: "a", organismo: "A", monto: 100 }]],
      ["r2/2026-02/page-1.json", [{ personKey: "a", organismo: "A", monto: 125 }]],
    ]);
    const readJson = async (key) => {
      requested.push(key);
      return objects.get(key) ?? null;
    };
    const result = await buildR2HistoryFromManifests([
      { period: "2026-01", version: "release-01", checksum_sha256: "checksum-01", total: 1, pages: [{ page: 1, key: "r2/2026-01/page-1.json", count: 1 }] },
      { period: "2026-02", version: "release-02", checksum_sha256: "checksum-02", total: 1, pages: [{ page: 1, key: "r2/2026-02/page-1.json", count: 1 }] },
    ], readJson, { keyFields: ["personKey"] });
    expect(requested).toEqual(["r2/2026-01/page-1.json", "r2/2026-02/page-1.json"]);
    expect(result.comparisons[0].amountChanges[0]).toMatchObject({ key: "a", amountBefore: 100, amountAfter: 125 });
  });

  it("does not accept a manifest with an incomplete page", async () => {
    await expect(buildR2HistoryFromManifests([
      { period: "2026-01", version: "release-01", checksum_sha256: "checksum-01", total: 2, pages: [{ page: 1, key: "missing.json", count: 2 }] },
    ], async () => [{ personKey: "a" }], { keyFields: ["personKey"] })).rejects.toThrow("conteo incorrecto");
  });
});
