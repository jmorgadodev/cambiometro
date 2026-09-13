import { describe, expect, it } from "vitest";
import { isQuotaWindowOpen, nextUtcResetAt, parseBlockedAt } from "./d1-post-reset-preflight.mjs";

describe("candado de reinicio D1", () => {
  it("calcula el siguiente reinicio a medianoche UTC", () => {
    expect(nextUtcResetAt(new Date("2026-09-04T18:45:00.000Z")).toISOString())
      .toBe("2026-09-05T00:00:00.000Z");
  });

  it("mantiene bloqueada la prueba antes del reinicio", () => {
    const blockedAt = new Date("2026-09-04T18:45:00.000Z");
    expect(isQuotaWindowOpen({
      blockedAt,
      now: new Date("2026-09-04T23:59:59.999Z"),
    })).toBe(false);
  });

  it("abre la prueba desde el reinicio exacto", () => {
    const blockedAt = new Date("2026-09-04T18:45:00.000Z");
    expect(isQuotaWindowOpen({
      blockedAt,
      now: new Date("2026-09-05T00:00:00.000Z"),
    })).toBe(true);
  });

  it("rechaza timestamps ausentes o inválidos", () => {
    expect(() => parseBlockedAt("")).toThrow("D1_BLOCKED_AT_MISSING");
    expect(() => parseBlockedAt("not-a-date")).toThrow("D1_BLOCKED_AT_INVALID");
  });
});
