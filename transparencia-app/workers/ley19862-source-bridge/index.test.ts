import { describe, expect, it } from "vitest";
import { tokenMatches } from "./index";

describe("Ley 19.862 source bridge token validation", () => {
  it("accepts a secret with the trailing newline produced by stdin", () => {
    expect(tokenMatches("bridge-token", "bridge-token\n")).toBe(true);
    expect(tokenMatches("  bridge-token\r\n", "bridge-token")).toBe(true);
  });

  it("still requires a non-empty exact token", () => {
    expect(tokenMatches("bridge-token", "another-token")).toBe(false);
    expect(tokenMatches("", "")).toBe(false);
    expect(tokenMatches("bridge-token", "")).toBe(false);
  });
});
