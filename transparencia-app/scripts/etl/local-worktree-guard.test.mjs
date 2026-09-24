import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDirtyWorktreePaths } from "./local-worktree-guard.mjs";

describe("parseDirtyWorktreePaths", () => {
  it("accepts a clean worktree", () => {
    assert.deepEqual(parseDirtyWorktreePaths(""), []);
  });

  it("blocks modified, staged, and untracked inputs before ETL hydration", () => {
    const status = [
      " M data/politicos-votaciones.json",
      "A  data/lake-subsets/politicos-votaciones.subset.json",
      "?? lib/home-search.ts",
    ].join("\n");

    assert.equal(parseDirtyWorktreePaths(status).length, 3);
  });

  it("keeps the destination path for renamed files", () => {
    assert.deepEqual(parseDirtyWorktreePaths("R  old.json -> new.json"), ["new.json"]);
  });
});
