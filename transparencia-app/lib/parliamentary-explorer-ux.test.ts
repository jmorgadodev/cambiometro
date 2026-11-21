import { describe, it, expect } from "vitest";
import {
  addComparisonPatch,
  contextFilterPatch,
  monthlyRosterCount,
  sortAmountDesc,
} from "./parliamentary-explorer-ux";
import {
  explorerDefaults,
  type ExplorerData,
  type ExplorerRecord,
} from "./parliamentary-explorer";
const data = { members: [], facts: [] } as unknown as ExplorerData;
const q = () => ({
  ...explorerDefaults(data),
  compareIds: ["a"],
  memberIds: ["a"],
  partyIds: ["ps"],
  regionIds: ["maule"],
});
describe("progressive explorer actions", () => {
  it("adds comparison without touching filters and avoids duplicates", () => {
    expect(addComparisonPatch(q(), "member", "b")).toEqual({
      compareBy: "member",
      compareIds: ["a", "b"],
    });
    expect(addComparisonPatch(q(), "member", "a").compareIds).toEqual(["a"]);
  });
  it("adds a contextual member without clearing comparison or earlier members", () => {
    const patch = contextFilterPatch(q(), { kind: "member", id: "b" });
    expect(patch.memberIds).toEqual(["a", "b"]);
    expect(patch).not.toHaveProperty("compareIds");
  });
  it("adds regions and parties progressively", () => {
    expect(
      contextFilterPatch(q(), { kind: "region", id: "biobio" }).regionIds,
    ).toEqual(["maule", "biobio"]);
    expect(
      contextFilterPatch(q(), { kind: "party", id: "rn" }).partyIds,
    ).toEqual(["ps", "rn"]);
  });
  it("sorts money numerically with missing last", () =>
    expect(
      sortAmountDesc([
        { amount: 2 },
        { amount: null },
        { amount: 1000 },
        { amount: 0 },
      ]).map((x) => x.amount),
    ).toEqual([1000, 2, 0, null]));
});
const row = (name: string, patch: Partial<ExplorerRecord> = {}) =>
  ({
    component: "personal",
    memberId: "a",
    period: "2026-04",
    personName: name,
    recordCount: 1,
    amount: 50,
    ...patch,
  }) as ExplorerRecord;
describe("monthly nominal roster", () => {
  it("counts complete distinct published names in one team and month", () =>
    expect(
      monthlyRosterCount(
        [row("Ana María Pérez"), row("Juan Carlos Soto")],
        "2026-04",
        "2026-04",
      ),
    ).toBe(2));
  it("does not count across months or teams", () => {
    expect(
      monthlyRosterCount([row("Ana María Pérez")], "2026-03", "2026-04"),
    ).toBeNull();
    expect(
      monthlyRosterCount(
        [row("Ana María Pérez"), row("Juan Carlos Soto", { memberId: "b" })],
        "2026-04",
        "2026-04",
      ),
    ).toBeNull();
  });
  it("omits count when a name repeats or is missing, without deduplicating contracts", () => {
    expect(
      monthlyRosterCount(
        [row("Ana María Pérez"), row("ANA MARIA PEREZ")],
        "2026-04",
        "2026-04",
      ),
    ).toBeNull();
    expect(monthlyRosterCount([row("")], "2026-04", "2026-04")).toBeNull();
    expect(
      monthlyRosterCount(
        [row("Ana María Pérez", { recordCount: 3 })],
        "2026-04",
        "2026-04",
      ),
    ).toBeNull();
  });
});
