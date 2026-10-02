import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { latestCalendarSlot, classifyCalendarExecution } from "../calendar-monitor.mjs";

const now = new Date("2026-10-01T12:00:00Z");
const scheduled = { workflow: "etl-daily.yml", cronUtc: "0 7 * * *" };
const run = (conclusion, status = "completed") => ({
  id: 1, event: "schedule", run_started_at: "2026-10-01T07:10:00Z", status, conclusion,
});

describe("ETL calendar monitor (execution only)", () => {
  it("keeps the daily workflow read-only, without ETL, deploy or Cloudflare credentials", () => {
    const workflow = readFileSync(new URL("../../../../.github/workflows/source-calendar-monitor.yml", import.meta.url), "utf8");
    expect(workflow).toContain('cron: "0 15 * * *"');
    expect(workflow).toContain("actions: read");
    expect(workflow).not.toMatch(/issues: write|contents: write|wrangler|CLOUDFLARE|data:publish|npm run etl/);
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
