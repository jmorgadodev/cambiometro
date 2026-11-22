import { describe, it, expect } from "vitest";
import { compareNormativeDocuments } from "./normative-monitor.mjs";
describe("normative detection without automatic interpretation", () => {
  it("keeps unchanged documents approved", () =>
    expect(
      compareNormativeDocuments(
        [{ url: "a", sha256: "x" }],
        [{ url: "a", sha256: "x" }],
      ),
    ).toEqual([]));
  it("marks changed content and new documents as pending without editing approved input", () => {
    const approved = [{ url: "a", sha256: "x" }];
    const r = compareNormativeDocuments(approved, [
      { url: "a", sha256: "y" },
      { url: "b", sha256: "z" },
    ]);
    expect(r).toHaveLength(2);
    expect(r.every((d) => d.status === "pending-validation")).toBe(true);
    expect(approved[0].sha256).toBe("x");
  });
});
