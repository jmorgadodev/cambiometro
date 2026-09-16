import { describe, expect, it } from "vitest";
import { buildCpltCoverageIndex } from "../scripts/cplt-coverage-index.mjs";

describe("índice de cobertura CPLT", () => {
  it("agrega por organismo y período sin copiar filas completas", () => {
    const result = buildCpltCoverageIndex([
      { oid: "org-b", o: "Organismo B", ot: "ministerio", p: "2026-02", b: 100, t: "planta", q: [] },
      { oid: "org-b", o: "Organismo B", ot: "ministerio", p: "2026-02", b: 0, t: "contrata", q: ["observado"] },
      { oid: "org-a", o: "Organismo A", ot: "servicio", p: "2026-01", b: 250, t: "honorarios", q: [] },
      { oid: "org-a", o: "Organismo A", ot: "servicio", p: "2026-13", b: 300, t: "planta", q: [] },
    ]);

    expect(result.totalRows).toBe(4);
    expect(result.indexedRows).toBe(3);
    expect(result.invalidPeriodRows).toBe(1);
    expect(result.entries).toEqual([
      {
        organismId: "org-a",
        organismName: "Organismo A",
        organismType: "servicio",
        period: "2026-01",
        records: 1,
        recordsWithAmount: 1,
        zeroAmount: 0,
        amountNotClassified: 0,
        qualityIssueRows: 0,
        grossTotal: 250,
        contractCounts: { honorarios: 1 },
      },
      {
        organismId: "org-b",
        organismName: "Organismo B",
        organismType: "ministerio",
        period: "2026-02",
        records: 2,
        recordsWithAmount: 1,
        zeroAmount: 1,
        amountNotClassified: 0,
        qualityIssueRows: 1,
        grossTotal: 100,
        contractCounts: { contrata: 1, planta: 1 },
      },
    ]);
  });

  it("mantiene separados los montos no clasificables y el cero", () => {
    const result = buildCpltCoverageIndex([
      { oid: "org", p: "2026-01", b: null, t: "planta" },
      { oid: "org", p: "2026-01", b: "no informado", t: "planta" },
      { oid: "org", p: "2026-01", b: 0, t: "planta" },
    ]);

    expect(result.entries[0]).toMatchObject({ records: 3, recordsWithAmount: 0, zeroAmount: 1, amountNotClassified: 2, grossTotal: 0 });
  });
});
