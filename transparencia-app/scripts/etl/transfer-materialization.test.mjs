import { describe, expect, it } from "vitest";
import { shouldSkipTransferMaterialization } from "./transfer-materialization.mjs";

describe("materialización D1 de transferencias", () => {
  it("omite una release cuyo checksum ya está activa", () => {
    expect(shouldSkipTransferMaterialization("same", "same")).toBe(true);
  });

  it("materializa una release nueva o modificada", () => {
    expect(shouldSkipTransferMaterialization("old", "new")).toBe(false);
  });

  it("no omite si falta el checksum anterior", () => {
    expect(shouldSkipTransferMaterialization(null, "new")).toBe(false);
  });
});
