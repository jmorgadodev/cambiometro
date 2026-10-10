import { afterEach, describe, expect, it, vi } from "vitest";
import { assertRemoteR2WriteBudget } from "../scripts/etl/r2-account-budget.mjs";

vi.mock("./r2-live-list.mjs", () => ({
  listR2Objects: vi.fn(async ({ bucket }: { bucket: string }) => [{ key: "data.json", size: bucket === "other-project" ? 9_500_000_000 : 1 }]),
}));
afterEach(() => vi.unstubAllGlobals());
function stubBudgetFetch(buckets = [{ name: "primary" }]) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true, result: { buckets } }))));
}
describe("account-wide public R2 write budget", () => {
  it("blocks writes even when the excess is in a bucket omitted by the caller", async () => {
    stubBudgetFetch([{ name: "primary" }, { name: "other-project" }]);
    await expect(assertRemoteR2WriteBudget({ accountId: "account", token: "test", buckets: ["primary"] })).rejects.toThrow("R2_WRITE_BLOCKED");
  });
  it("fails closed if account-wide bucket inventory is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("denied", { status: 403 })));
    await expect(assertRemoteR2WriteBudget({ accountId: "account", token: "test", buckets: ["primary"] })).rejects.toThrow("R2_WRITE_GUARD_BUCKET_LIST_403");
  });
  it("cannot raise the free storage allowance through configuration", async () => {
    stubBudgetFetch([{ name: "other-project" }]);
    await expect(assertRemoteR2WriteBudget({ accountId: "account", token: "test", limitBytes: 20_000_000_000 })).rejects.toThrow("R2_WRITE_BLOCKED");
  });
  it("blocks a publication whose estimated operations exceed its per-run cap", async () => {
    stubBudgetFetch();
    const puts = Array.from({ length: 6_000 }, (_, index) => ({ bucket: "primary", key: `${index}.json`, size: 1 }));
    await expect(assertRemoteR2WriteBudget({ accountId: "account", token: "test", puts })).rejects.toThrow("R2_PUBLICATION_OPERATION_ESTIMATE_TOO_LARGE");
  });
  it("estimates per-publication operations without querying account analytics", async () => {
    stubBudgetFetch();
    const result = await assertRemoteR2WriteBudget({ accountId: "account", token: "test" });
    expect(result.operationsBudget).toMatchObject({
      method: "per-publication-estimate",
      estimatedClassA: 103,
      estimatedClassB: 100,
      maxPublicationClassA: 50_000,
      maxPublicationClassB: 500_000,
    });
    expect(result.operationsBudget.accountTotals).toContain("not queried");
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls.every(([url]) => !String(url).endsWith("/graphql"))).toBe(true);
    expect(calls.every(([, options]) => !options?.method || options.method === "GET")).toBe(true);
  });
});
