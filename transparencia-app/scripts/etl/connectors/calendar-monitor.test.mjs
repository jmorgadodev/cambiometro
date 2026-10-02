import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { latestCalendarSlot, classifyCalendarExecution, checkStaticReleaseConsistency } from "../calendar-monitor.mjs";
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
