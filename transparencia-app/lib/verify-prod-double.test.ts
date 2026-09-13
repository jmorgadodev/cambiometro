import { describe, expect, it } from "vitest";
import { parseDelayMs } from "../scripts/verify-prod-double.mjs";

describe("double production verifier", () => {
  it("uses ten minutes by default", () => {
    expect(parseDelayMs(undefined)).toBe(600_000);
  });

  it("allows a zero delay for a deterministic local smoke", () => {
    expect(parseDelayMs("0")).toBe(0);
  });

  it("rejects invalid delays", () => {
    expect(() => parseDelayMs("-1")).toThrow("entero >= 0");
    expect(() => parseDelayMs("not-a-number")).toThrow("entero >= 0");
  });
});
