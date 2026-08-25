import { describe, expect, it } from "vitest";
import { assertMinimumTransferRows, CANONICAL_MIN_TRANSFER_ROWS } from "../scripts/etl/transfer-release-guard.mjs";

describe("guardia del release de transferencias", () => {
  it("acepta el universo canónico o una actualización que lo amplía", () => {
    expect(assertMinimumTransferRows(CANONICAL_MIN_TRANSFER_ROWS)).toBe(CANONICAL_MIN_TRANSFER_ROWS);
    expect(assertMinimumTransferRows(CANONICAL_MIN_TRANSFER_ROWS + 183)).toBe(CANONICAL_MIN_TRANSFER_ROWS + 183);
  });

  it("rechaza un release mensual que perdió el histórico", () => {
    expect(() => assertMinimumTransferRows(6_652)).toThrow("TRANSFER_RELEASE_INCOMPLETE");
  });
});
