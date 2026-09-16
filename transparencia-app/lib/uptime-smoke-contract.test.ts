import { describe, expect, it } from "vitest";
import { buildRequestHeaders, validateMovimientosAsset, validateSmokeConfiguration } from "../scripts/uptime-smoke.mjs";

describe("uptime smoke contract", () => {
  it("sends the WAF token to monitored requests", () => {
    expect(buildRequestHeaders("/", "secret")).toEqual({
      "User-Agent": "Cambiometro-UptimeSmoke/1.0",
      "X-Cambiometro-Uptime-Token": "secret",
    });
    expect(buildRequestHeaders("/api/v1/health", "secret")).toEqual({
      "User-Agent": "Cambiometro-UptimeSmoke/1.0",
      "X-Cambiometro-Uptime-Token": "secret",
    });
    expect(buildRequestHeaders("/politico", "secret")).toEqual({
      "User-Agent": "Cambiometro-UptimeSmoke/1.0",
      "X-Cambiometro-Uptime-Token": "secret",
    });
  });

  it("rejects a GitHub Actions run without the protected smoke secret", () => {
    expect(() => validateSmokeConfiguration({ githubActions: true, uptimeToken: "" })).toThrow("UPTIME_TOKEN_MISSING");
    expect(() => validateSmokeConfiguration({ githubActions: true, uptimeToken: "secret" })).not.toThrow();
  });

  it("validates movimientos using the reconciled release and declared count", () => {
    const movimientos = Array.from({ length: 46 }, (_, index) => ({ id: `mov-${index + 1}` }));
    expect(validateMovimientosAsset({
      pipeline: "etl_movimientos_autoridades",
      release_status: "published_reconciled",
      stats: { total_movimientos: 46 },
      movimientos,
    })).toBe(true);
    expect(validateMovimientosAsset({
      pipeline: "etl_movimientos_autoridades",
      release_status: "published_reconciled",
      stats: { total_movimientos: 79 },
      movimientos,
    })).toBe(false);
  });
});
