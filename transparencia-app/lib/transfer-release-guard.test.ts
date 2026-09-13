import { describe, expect, it } from "vitest";
import {
  assertCanonicalTransferRelease,
  assertMinimumTransferRows,
  CANONICAL_MIN_TRANSFER_ROWS,
  CANONICAL_MIN_TRANSFER_TOTAL_CLP,
  CANONICAL_TRANSFER_ROWS,
  CANONICAL_TRANSFER_TOTAL_CLP,
} from "../scripts/etl/transfer-release-guard.mjs";
import { buildTransferCoverageRow } from "../scripts/etl/transfer-coverage.mjs";

describe("guardia del release de transferencias", () => {
  it("acepta el mínimo histórico para la hidratación intermedia", () => {
    expect(assertMinimumTransferRows(CANONICAL_MIN_TRANSFER_ROWS)).toBe(CANONICAL_MIN_TRANSFER_ROWS);
    expect(assertMinimumTransferRows(CANONICAL_MIN_TRANSFER_ROWS + 183)).toBe(CANONICAL_MIN_TRANSFER_ROWS + 183);
  });

  it("acepta el baseline y releases oficiales posteriores", () => {
    expect(assertCanonicalTransferRelease({
      totalRows: CANONICAL_TRANSFER_ROWS,
      totalMontoClp: CANONICAL_TRANSFER_TOTAL_CLP,
    })).toBe(true);
    expect(assertCanonicalTransferRelease({
      totalRows: CANONICAL_TRANSFER_ROWS + 551,
      totalMontoClp: CANONICAL_MIN_TRANSFER_TOTAL_CLP + 9_594_414_040,
    })).toBe(true);
  });

  it("rechaza releases por debajo del baseline de filas o monto", () => {
    expect(() => assertCanonicalTransferRelease({
      totalRows: CANONICAL_MIN_TRANSFER_ROWS - 1,
      totalMontoClp: CANONICAL_MIN_TRANSFER_TOTAL_CLP,
    })).toThrow("TRANSFER_RELEASE_INCOMPLETE");
    expect(() => assertCanonicalTransferRelease({
      totalRows: CANONICAL_MIN_TRANSFER_ROWS,
      totalMontoClp: CANONICAL_MIN_TRANSFER_TOTAL_CLP - 1,
    })).toThrow("TRANSFER_RELEASE_INCOMPLETE");
  });

  it("rechaza un release mensual que perdió el histórico", () => {
    expect(() => assertMinimumTransferRows(6_652)).toThrow("TRANSFER_RELEASE_INCOMPLETE");
  });

  it("mide el release actual contra el baseline sin rechazar filas nuevas oficiales", () => {
    expect(buildTransferCoverageRow({ totalRows: 59_544, totalMontoClp: 5_013_581_357_467 })).toMatchObject({
      estado: "PASS",
      pass: true,
    });
    expect(buildTransferCoverageRow({ totalRows: 6_652, totalMontoClp: 1 })).toMatchObject({
      estado: "FAIL",
      pass: false,
    });
  });
});
