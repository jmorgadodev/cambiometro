import { afterEach, describe, expect, it, vi } from "vitest";
import { assertRemoteR2WriteBudget } from "../scripts/etl/r2-account-budget.mjs";

vi.mock("./r2-live-list.mjs", () => ({
  listR2Objects: vi.fn(async ({ bucket }: { bucket: string }) => [{ key: "data.json", size: bucket === "other-project" ? 9_500_000_000 : 1 }]),
}));
afterEach(() => vi.unstubAllGlobals());
describe("account-wide public R2 write budget", () => {
  it("blocks writes even when the excess is in a bucket omitted by the caller", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true, result: { buckets: [{ name: "primary" }, { name: "other-project" }] } }))));
    await expect(assertRemoteR2WriteBudget({ accountId: "account", token: "test", buckets: ["primary"] })).rejects.toThrow("R2_WRITE_BLOCKED");
  });
  it("fails closed if account-wide bucket inventory is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("denied", { status: 403 })));
    await expect(assertRemoteR2WriteBudget({ accountId: "account", token: "test", buckets: ["primary"] })).rejects.toThrow("R2_WRITE_GUARD_BUCKET_LIST_403");
  });
});
