import { describe, expect, it } from "vitest";
import { buildRequestHeaders, validateSmokeConfiguration } from "../scripts/uptime-smoke.mjs";

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
  });

  it("rejects a GitHub Actions run without the protected smoke secret", () => {
    expect(() => validateSmokeConfiguration({ githubActions: true, uptimeToken: "" })).toThrow("UPTIME_TOKEN_MISSING");
    expect(() => validateSmokeConfiguration({ githubActions: true, uptimeToken: "secret" })).not.toThrow();
  });
});
