import { describe, expect, it } from "vitest";
import { buildRequestHeaders, validateMovimientosAsset, validateSmokeConfiguration, planUptimeIncidents, syncUptimeIncidents } from "../scripts/uptime-smoke.mjs";

describe("uptime smoke contract", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  it("opens one incident for a new failing route", () => {
    expect(planUptimeIncidents([{ path: "/movimientos", isOk: false }], [], now))
      .toEqual([{ action: "create", path: "/movimientos" }]);
  });
  it("does not duplicate a recent incident when the HTTP failure changes", () => {
    expect(planUptimeIncidents([{ path: "/movimientos", isOk: false, status: 503 }], [
      { number: 1, title: "UPTIME: /movimientos 500", updatedAt: now.toISOString() },
    ], now)).toEqual([]);
  });
  it("reminds weekly on only one incident even if legacy duplicates exist", () => {
    expect(planUptimeIncidents([{ path: "/movimientos", isOk: false }], [
      { number: 1, title: "UPTIME: /movimientos 500", updatedAt: "2026-09-20T00:00:00Z" },
      { number: 2, title: "UPTIME: /movimientos TIMEOUT", updatedAt: "2026-09-22T00:00:00Z" },
    ], now)).toEqual([{ action: "remind", path: "/movimientos", number: 2 }]);
  });
  it("closes matching incidents only after the route has recovered", () => {
    expect(planUptimeIncidents([{ path: "/movimientos", isOk: true }], [
      { number: 1, title: "UPTIME: /movimientos", updatedAt: now.toISOString() },
      { number: 2, title: "UPTIME: /movimientos 500", updatedAt: now.toISOString() },
      { number: 3, title: "UPTIME: /movimientos/otro 500", updatedAt: now.toISOString() },
    ], now)).toEqual([
      { action: "close", path: "/movimientos", number: 1 },
      { action: "close", path: "/movimientos", number: 2 },
    ]);
  });
  it("does not claim recovery for an untested route", () => {
    expect(planUptimeIncidents([], [{ number: 1, title: "UPTIME: /movimientos" }], now)).toEqual([]);
  });
  it("never creates an incident if the GitHub inventory cannot be read", () => {
    const commands: string[][] = [];
    expect(() => syncUptimeIncidents([{ path: "/", isOk: false }], (_cmd: string, args: string[]) => {
      commands.push(args);
      throw new Error("GitHub unavailable");
    }, now)).toThrow("GitHub unavailable");
    expect(commands).toHaveLength(1);
    expect(commands[0].slice(0, 2)).toEqual(["issue", "list"]);
  });
  it("rejects an incomplete inventory rather than creating duplicates", () => {
    expect(() => syncUptimeIncidents([{ path: "/", isOk: false }], () =>
      JSON.stringify(Array.from({ length: 1000 }, () => ({ title: "UPTIME: /" }))), now))
      .toThrow("UPTIME_ISSUE_INVENTORY_INCOMPLETE");
  });
  it("sends a recovery close through the existing GitHub CLI, without creating issues", () => {
    const commands: string[][] = [];
    syncUptimeIncidents([{ path: "/", isOk: true, url: "https://example.test/", status: 200 }],
      (_cmd: string, args: string[]) => {
        commands.push(args);
        return JSON.stringify([{ number: 7, title: "UPTIME: / 500", updatedAt: now.toISOString() }]);
      }, now);
    expect(commands).toHaveLength(2);
    expect(commands[1].slice(0, 3)).toEqual(["issue", "close", "7"]);
    expect(commands[1]).toContain("--comment");
  });
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
