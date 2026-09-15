import { describe, expect, it } from "vitest";
import {
  assertR2HistoryPromotionAllowed,
  buildR2History,
  buildR2HistoryFromManifests,
  readR2SearchIndexRowsAtPositions,
} from "./r2-history.mjs";

const base = {
  releaseId: "release-",
  checksum: "checksum-",
  publishedAt: "2026-09-14T00:00:00Z",
};

describe("buildR2History", () => {
  it("lee sólo las páginas necesarias para una muestra del índice R2", async () => {
    const requested = [];
    const objects = new Map([
      ["page-1.json", [{ id: "a" }, { id: "b" }]],
      ["page-2.json", [{ id: "c" }, { id: "d" }]],
      ["page-3.json", [{ id: "e" }]],
    ]);
    const rows = await readR2SearchIndexRowsAtPositions({
      totalRows: 5,
      pageSize: 2,
      pages: [
        { page: 1, count: 2, key: "page-1.json" },
        { page: 2, count: 2, key: "page-2.json" },
        { page: 3, count: 1, key: "page-3.json" },
      ],
    }, [3, 0], async (key) => {
      requested.push(key);
      return objects.get(key);
    });

    expect(requested.sort()).toEqual(["page-1.json", "page-2.json"]);
    expect(rows).toEqual([
      { position: 0, record: { id: "a" }, page: "page-1.json" },
      { position: 3, record: { id: "d" }, page: "page-2.json" },
    ]);
  });

  it("sólo autoriza promoción con cierre R2 completo", () => {
    expect(assertR2HistoryPromotionAllowed({ complete: true, promotionAllowed: true, status: "verifiable" })).toBe(true);
    expect(() => assertR2HistoryPromotionAllowed({ complete: false, promotionAllowed: false, status: "catalogued_without_manifest" }))
      .toThrow("cierre no verificable");
  });

  it("bloquea el historial cuando se exige una compuerta R2 no verificable", async () => {
    await expect(buildR2HistoryFromManifests([
      { period: "2026-01", version: "release-01", checksum_sha256: "checksum-01", total: 0, pages: [{ page: 1, key: "empty.json", count: 0 }] },
    ], async () => [], {
      requirePromotionAllowed: true,
      closure: { complete: false, promotionAllowed: false, status: "catalogued_without_manifest" },
    })).rejects.toThrow("cierre no verificable");
  });

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

  it("ordena los manifiestos cronológicamente antes de calcular cambios", async () => {
    const objects = new Map([
      ["r2/2026-01/page-1.json", [{ personKey: "a", monto: 100 }]],
      ["r2/2026-02/page-1.json", [{ personKey: "a", monto: 125 }]],
    ]);
    const result = await buildR2HistoryFromManifests([
      { period: "2026-02", version: "release-02", checksum_sha256: "checksum-02", total: 1, pages: [{ page: 1, key: "r2/2026-02/page-1.json", count: 1 }] },
      { period: "2026-01", version: "release-01", checksum_sha256: "checksum-01", total: 1, pages: [{ page: 1, key: "r2/2026-01/page-1.json", count: 1 }] },
    ], async (key) => objects.get(key), { keyFields: ["personKey"] });
    expect(result.periods.map((period) => period.period)).toEqual(["2026-01", "2026-02"]);
    expect(result.comparisons[0].amountChanges[0]).toMatchObject({ amountBefore: 100, amountAfter: 125 });
  });

  it("rechaza dos manifiestos del mismo período", async () => {
    await expect(buildR2HistoryFromManifests([
      { period: "2026-01", version: "release-a", checksum_sha256: "checksum-a", total: 0, pages: [{ page: 1, key: "a.json", count: 0 }] },
      { period: "2026-01", version: "release-b", checksum_sha256: "checksum-b", total: 0, pages: [{ page: 1, key: "b.json", count: 0 }] },
    ], async () => [], { keyFields: ["personKey"] })).rejects.toThrow("período duplicado");
  });

  it("does not accept a manifest with an incomplete page", async () => {
    await expect(buildR2HistoryFromManifests([
      { period: "2026-01", version: "release-01", checksum_sha256: "checksum-01", total: 2, pages: [{ page: 1, key: "missing.json", count: 2 }] },
    ], async () => [{ personKey: "a" }], { keyFields: ["personKey"] })).rejects.toThrow("conteo incorrecto");
  });

  it("supports physical R2 manifests with JSONL artifacts", async () => {
    const result = await buildR2HistoryFromManifests([
      {
        id: "camara/asistencia_camara/2026/09",
        sourcePeriod: null,
        year: 2026,
        month: 9,
        projectionChecksumSha256: "artifact-checksum",
        recordCount: 2,
        artifacts: [{ key: "records.jsonl.gz", size: 10 }],
      },
    ], async () => {
      return [
        { personKey: "a", organismo: "Cámara", monto: 100 },
        { personKey: "b", organismo: "Cámara", monto: 200 },
      ];
    }, { keyFields: ["personKey"] });
    expect(result.periods[0]).toMatchObject({ period: "2026-09", releaseId: "camara/asistencia_camara/2026/09", count: 2 });
    expect(result.historyByKey.a[0].original.monto).toBe(100);
  });

  it("rejects an artifact checksum returned by the R2 reader when it differs", async () => {
    await expect(buildR2HistoryFromManifests([{
      id: "source/2026/09",
      year: 2026,
      month: 9,
      projectionChecksumSha256: "projection-checksum",
      recordCount: 1,
      artifacts: [{ key: "records.jsonl.gz", checksumSha256: "expected-artifact-checksum" }],
    }], async () => ({ records: [{ personKey: "a" }], checksumSha256: "different-artifact-checksum" }), { keyFields: ["personKey"] })).rejects.toThrow("checksum incorrecto");
  });

  it("accepts an explicit resolver for nested official identities", () => {
    const result = buildR2History([
      {
        period: "2026-09",
        releaseId: "camara-09",
        checksum: "checksum-09",
        records: [{ data: { deputy: { entity_id: "person-camara-1009" } }, monto: 1 }],
      },
    ], {
      keyResolver: (row) => row.data?.deputy?.entity_id,
    });
    expect(result.historyByKey["person-camara-1009"]).toHaveLength(1);
    expect(result.periods[0].fallbackKeys).toBe(0);
  });
});
