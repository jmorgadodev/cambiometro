import { afterEach, describe, expect, it, vi } from "vitest";
import { assertRemoteR2WriteBudget } from "../scripts/etl/r2-account-budget.mjs";

vi.mock("./r2-live-list.mjs", () => ({
  listR2Objects: vi.fn(async ({ bucket }: { bucket: string }) => [{ key: "data.json", size: bucket === "other-project" ? 9_500_000_000 : 1 }]),
}));
afterEach(() => vi.unstubAllGlobals());
function telemetry(requests = 1, actionType = "GetObject") {
  return { data: { viewer: { accounts: [{ r2OperationsAdaptiveGroups: [{ sum: { requests }, dimensions: { actionType } }] }] } } };
}
function stubBudgetFetch(operations: unknown = telemetry(), buckets = [{ name: "primary" }]) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify(
    url.endsWith("/graphql") ? operations : { success: true, result: { buckets } },
  ))));
}
describe("account-wide public R2 write budget", () => {
  it("blocks writes even when the excess is in a bucket omitted by the caller", async () => {
    stubBudgetFetch(telemetry(), [{ name: "primary" }, { name: "other-project" }]);
    await expect(assertRemoteR2WriteBudget({ accountId: "account", token: "test", buckets: ["primary"] })).rejects.toThrow("R2_WRITE_BLOCKED");
  });
  it("fails closed if account-wide bucket inventory is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("/graphql")
      ? new Response(JSON.stringify(telemetry())) : new Response("denied", { status: 403 })));
    await expect(assertRemoteR2WriteBudget({ accountId: "account", token: "test", buckets: ["primary"] })).rejects.toThrow("R2_WRITE_GUARD_BUCKET_LIST_403");
  });
  it("cannot raise the free storage allowance through configuration", async () => {
    stubBudgetFetch(telemetry(), [{ name: "other-project" }]);
    await expect(assertRemoteR2WriteBudget({ accountId: "account", token: "test", limitBytes: 20_000_000_000 })).rejects.toThrow("R2_WRITE_BLOCKED");
  });
  it.each([[950_000, "PutObject"], [9_500_000, "GetObject"]])("blocks at 95 percent of operation allowance (%i %s)", async (requests, action) => {
    stubBudgetFetch(telemetry(requests, action));
    await expect(assertRemoteR2WriteBudget({ accountId: "account", token: "test" })).rejects.toThrow("R2_OPERATIONS_BLOCKED_AT_95_PERCENT");
  });
  it("includes planned uploads and retries before allowing publication", async () => {
    stubBudgetFetch(telemetry(949_995, "PutObject"));
    await expect(assertRemoteR2WriteBudget({ accountId: "account", token: "test", puts: [{ bucket: "primary", key: "new.json", size: 1 }] })).rejects.toThrow("R2_OPERATIONS_BLOCKED_AT_95_PERCENT");
  });
  it.each([{}, { errors: [{ message: "denied" }] }, telemetry(1, "UnknownAction"), telemetry(-1), telemetry(Number.NaN)])("fails closed on missing or invalid telemetry", async (payload) => {
    stubBudgetFetch(payload);
    await expect(assertRemoteR2WriteBudget({ accountId: "account", token: "test" })).rejects.toThrow("R2_OPERATIONS_TELEMETRY_INVALID");
  });
  it("fails closed when analytics permission is missing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("denied", { status: 403 })));
    await expect(assertRemoteR2WriteBudget({ accountId: "account", token: "test" })).rejects.toThrow("R2_OPERATIONS_TELEMETRY_403");
  });
  it("uses account-wide rolling 31 days and returns both budgets without writing R2", async () => {
    stubBudgetFetch();
    const result = await assertRemoteR2WriteBudget({ accountId: "account", token: "test" });
    expect(result).toHaveProperty("operationsBudget.classB", 1);
    const calls = vi.mocked(fetch).mock.calls;
    const query = JSON.parse(String(calls[0][1]?.body));
    expect(query.variables.accountTag).toBe("account");
    expect(Date.parse(query.variables.endDate) - Date.parse(query.variables.startDate)).toBe(31 * 86_400_000);
    expect(query.query).not.toContain("bucketName");
    expect(calls.slice(1).every(([, options]) => !options?.method || options.method === "GET")).toBe(true);
  });
});
