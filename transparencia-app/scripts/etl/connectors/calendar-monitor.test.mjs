import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { latestCalendarSlot, classifyCalendarExecution, checkStaticReleaseConsistency, sourceFreshnessLimits, evaluateSourceFreshness, checkPublishedApiHealth, checkR2Budget } from "../calendar-monitor.mjs";
import { buildReleaseSet } from "../../release-set.mjs";
import { buildStaticInputManifest } from "../../static-site-inputs.mjs";

const now = new Date("2026-10-01T12:00:00Z");
const scheduled = { workflow: "etl-daily.yml", cronUtc: "0 7 * * *" };
const run = (conclusion, status = "completed") => ({
  id: 1, event: "schedule", run_started_at: "2026-10-01T07:10:00Z", status, conclusion,
});

describe("ETL calendar monitor (execution only)", () => {
  it("keeps the daily workflow read-only for data, without ETL, deploy or D1", () => {
    const workflow = readFileSync(new URL("../../../../.github/workflows/source-calendar-monitor.yml", import.meta.url), "utf8");
    expect(workflow).toContain('cron: "0 15 * * *"');
    expect(workflow).toContain("actions: read");
    expect(workflow).not.toMatch(/contents: write|wrangler|data:publish|npm run etl|d1 execute/);
    expect(workflow).toContain("--release-check");
    expect(workflow).toContain("--source-check --budget-check");
    expect(workflow).toContain("issues: write");
    expect(workflow).toContain("retention-days: 3");
  });
  it("uses the existing UTC calendar with a bounded scheduler grace", () => {
    expect(latestCalendarSlot("0 7 * * *", now, 180)).toBe("2026-10-01T07:00:00.000Z");
    expect(latestCalendarSlot("0 7 * * *", new Date("2026-10-01T08:00:00Z"), 180))
      .toBe("2026-09-30T07:00:00.000Z");
    expect(latestCalendarSlot("0 9 1 1,4,7,10 *", now, 0)).toBe("2026-10-01T09:00:00.000Z");
    expect(latestCalendarSlot("0 9 1 3,9 *", now, 0)).toBe("2026-09-01T09:00:00.000Z");
  });
  it("does not invent a schedule for manual sources", () => {
    expect(classifyCalendarExecution({ ...scheduled, cronUtc: null }, [], now).executionState).toBe("manual");
  });
  it("distinguishes missed, running, failed and on-schedule executions", () => {
    expect(classifyCalendarExecution(scheduled, [], now).executionState).toBe("missed");
    expect(classifyCalendarExecution(scheduled, [run(null, "in_progress")], now).executionState).toBe("pending");
    expect(classifyCalendarExecution(scheduled, [run("failure")], now).executionState).toBe("failed");
    expect(classifyCalendarExecution(scheduled, [run("success")], now).executionState).toBe("on_schedule");
  });
  it("ignores PR validation and old successful executions", () => {
    expect(classifyCalendarExecution(scheduled, [
      { ...run("success"), event: "pull_request" },
      { ...run("success"), run_started_at: "2026-09-30T07:10:00Z" },
    ], now).executionState).toBe("missed");
  });
  it("does not report a failed attempt as healthy because another attempt passed earlier", () => {
    expect(classifyCalendarExecution(scheduled, [run("success"), {
      ...run("failure"), run_started_at: "2026-10-01T10:00:00Z",
    }], now).executionState).toBe("failed");
  });
  it("rejects unsupported cron syntax and invalid grace instead of guessing", () => {
    expect(() => latestCalendarSlot("*/5 * * * *", now, 180)).toThrow("UNSUPPORTED_CALENDAR_CRON");
    expect(() => latestCalendarSlot("0 7 * * *", now, -1)).toThrow("INVALID_CALENDAR_CLOCK");
  });
});

describe("daily static release consistency, not source coverage", () => {
  const entry = { path: "data/movimientos.json", key: `projections/static-site-v1/releases/${"a".repeat(64)}/data/movimientos.json`, size: 10, checksumSha256: "a".repeat(64) };
  const manifest = buildStaticInputManifest({ entries: [entry] });
  const pinned = buildReleaseSet(manifest);
  const fetchJson = (responses) => async () => Response.json(responses.shift());
  it("marks matching validated pins healthy with two metadata reads only", async () => {
    const result = await checkStaticReleaseConsistency({ accountId: "account", token: "token", fetchImpl: fetchJson([manifest, pinned]) });
    expect(result).toMatchObject({ state: "healthy", isOk: true, scope: "static-release-consistency", metadataReads: 2 });
  });
  it("marks a valid older Pages pin stale instead of healthy", async () => {
    const current = buildStaticInputManifest({ entries: [{ ...entry, checksumSha256: "b".repeat(64) }] });
    const result = await checkStaticReleaseConsistency({ accountId: "account", token: "token", fetchImpl: fetchJson([current, pinned]) });
    expect(result).toMatchObject({ state: "stale", isOk: false });
  });
  it("never declares an invalid checksum or unavailable metadata healthy", async () => {
    for (const fetchImpl of [fetchJson([{ ...manifest, checksumSha256: "0".repeat(64) }]), async () => new Response("blocked", { status: 403 })]) {
      const result = await checkStaticReleaseConsistency({ accountId: "account", token: "token", fetchImpl });
      expect(result).toMatchObject({ state: "failed_internal", isOk: false });
    }
  });
  it("keeps missing credentials fail-closed without network reads", async () => {
    const result = await checkStaticReleaseConsistency({});
    expect(result).toMatchObject({ state: "failed_internal", metadataReads: 0, isOk: false });
  });
});

describe("published source freshness", () => {
  const limits = { camara: 36, infolobby: 216, dipres: 4320, ine: null };
  const now = new Date("2026-10-10T12:00:00Z");

  it("classifies scheduled releases by their source-specific freshness window", () => {
    const result = evaluateSourceFreshness([
      { id: "camara", recordCount: 100, lastUpdated: "2026-10-10T00:00:00Z", lastUpdatedKind: "source-success", checksumSha256: "a".repeat(64) },
      { id: "infolobby", recordCount: 20, lastUpdated: "2026-10-03T00:00:00Z", lastUpdatedKind: "release", checksumSha256: "b".repeat(64) },
      { id: "dipres", recordCount: 4, lastUpdated: "2026-01-01T00:00:00Z", lastUpdatedKind: "release", checksumSha256: "c".repeat(64) },
      { id: "ine", recordCount: 346, lastUpdated: null, lastUpdatedKind: "unknown", checksumSha256: null },
    ], { limits, now });

    expect(result.sources.map(({ id, state }) => [id, state])).toEqual([
      ["camara", "healthy"], ["infolobby", "healthy"], ["dipres", "stale"], ["ine", "not_scheduled"],
    ]);
    expect(result.isOk).toBe(false);
  });

  it("fails closed when a scheduled source lacks a verifiable release timestamp", () => {
    const result = evaluateSourceFreshness([
      { id: "camara", recordCount: 100, lastUpdated: null, lastUpdatedKind: "unknown", checksumSha256: null },
    ], { limits, now });
    expect(result.sources[0]).toMatchObject({ state: "unknown", lastUpdated: null });
    expect(result.isOk).toBe(false);
  });

  it("marks missing scheduled sources and duplicate IDs as invalid metadata", () => {
    expect(evaluateSourceFreshness([], { limits, now })).toMatchObject({ state: "failed_internal", isOk: false });
    expect(evaluateSourceFreshness([
      { id: "camara", recordCount: 1, lastUpdated: "2026-10-10T00:00:00Z" },
      { id: "camara", recordCount: 1, lastUpdated: "2026-10-10T00:00:00Z" },
    ], { limits, now })).toMatchObject({ state: "failed_internal", isOk: false });
  });

  it("derives conservative freshness windows from the canonical ETL calendar", () => {
    const limits = sourceFreshnessLimits({ entries: [
      { workflow: "daily.yml", cronUtc: "0 7 * * *" },
      { workflow: "weekly.yml", cronUtc: "0 8 * * 1" },
      { workflow: "monthly.yml", cronUtc: "0 9 5 * *" },
      { workflow: "quarterly.yml", cronUtc: "0 9 1 1,4,7,10 *" },
      { workflow: "local.yml", cronUtc: null },
    ] }, {
      "daily.yml": { ids: ["daily"] }, "weekly.yml": { ids: ["weekly"] },
      "monthly.yml": { ids: ["monthly"] }, "quarterly.yml": { ids: ["quarterly"] },
      "local.yml": { ids: ["local"] },
    }, ["daily", "weekly", "monthly", "quarterly", "local", "ine", "senado"]);
    expect(limits).toMatchObject({ daily: 36, weekly: 216, monthly: 1080, quarterly: 3600, local: null, ine: null, senado: null });
    expect(sourceFreshnessLimits({ entries: [{ workflow: "cplt", cronUtc: "0 9 5 * *" }] }, {
      cplt: { ids: ["transparencia-activa", "ley19862"] },
    }, ["cplt", "ley-19862"])).toMatchObject({ cplt: 1080, "ley-19862": 1080 });
  });

  it("maps every public API source and leaves only static/manual sources unscheduled", () => {
    const calendar = JSON.parse(readFileSync(new URL("../../../../.github/etl-calendar.json", import.meta.url), "utf8"));
    expect(sourceFreshnessLimits(calendar)).toEqual({
      ine: null, senado: null, camara: 36, chilecompra: 216, contraloria: 1080,
      cplt: 1080, dipres: 3600, infolobby: 216, infoprobidad: 1080,
      "ley-19862": 1080, servel: null, sinim: 5760,
    });
  });
});

describe("production API and R2 budget checks", () => {
  it("checks source metadata and the R2-backed transfer health endpoint without D1", async () => {
    const bodies = [
      { data: [{ id: "camara", recordCount: 2, lastUpdated: "2026-10-10T00:00:00Z", lastUpdatedKind: "source-success", checksumSha256: "a".repeat(64) }, { id: "ine", recordCount: 346, lastUpdated: null }, { id: "ley-19862", recordCount: 62_172, lastUpdated: "2026-10-10T00:00:00Z" }] },
      { data: { ok: true, publicDataBackend: "r2", transferSource: "r2", transferRows: 62_172, generatedAt: "2026-10-10T00:00:00Z" } },
    ];
    const calls = [];
    const result = await checkPublishedApiHealth({
      productionUrl: "https://example.test", now: new Date("2026-10-10T12:00:00Z"),
      limits: { camara: 36, ine: null, "ley-19862": 1080 },
      fetchImpl: async (url, init) => { calls.push({ url: String(url), init }); return Response.json(bodies.shift()); },
    });
    expect(calls.map(({ url }) => new URL(url).pathname)).toEqual(["/api/v1/sources", "/api/v1/health"]);
    expect(result).toMatchObject({ apiState: "healthy", transferSource: "r2", transferRows: 62_172 });
    expect(result.sources.isOk).toBe(true);
  });

  it("does not call a failed API response healthy", async () => {
    const result = await checkPublishedApiHealth({ fetchImpl: async () => new Response("unavailable", { status: 503 }) });
    expect(result).toMatchObject({ apiState: "failed_internal", isOk: false });
  });

  it("reports only the read-only account budget and blocks at the shared storage threshold", async () => {
    const result = await checkR2Budget({ accountId: "account", token: "existing", checkBudget: async () => ({ currentBytes: 9_600_000_000, thresholdBytes: 9_500_000_000, blocked: true, operationsBudget: { method: "per-publication-estimate", estimatedClassA: 10, estimatedClassB: 10 } }) });
    expect(result).toMatchObject({ state: "blocked", isOk: false, currentBytes: 9_600_000_000, operationsBudget: { method: "per-publication-estimate" } });
  });
});
