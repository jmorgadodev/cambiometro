import { describe, expect, it } from "vitest";
import { createCrossSearchBucket } from "../scripts/build-cruces-static";

describe("cruces static search buckets", () => {
  it("indexes constructor as an ordinary token and preserves every row", () => {
    const bucket = createCrossSearchBucket();
    ["constructor", "salud", "constructor"].forEach((token, row) => {
      (bucket[token] ??= []).push(row);
    });
    expect(JSON.parse(JSON.stringify(bucket))).toEqual({ constructor: [0, 2], salud: [1] });
    expect(Object.getPrototypeOf(bucket)).toBeNull();
  });
});
