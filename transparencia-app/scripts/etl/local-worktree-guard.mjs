import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function parseDirtyWorktreePaths(output) {
  return String(output ?? "")
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => line.slice(3).split(" -> ").at(-1).trim())
    .filter(Boolean);
}

export function assertCleanWorktree(output) {
  const dirtyPaths = parseDirtyWorktreePaths(output);
  if (dirtyPaths.length > 0) {
    throw new Error(`SENADO_LOCAL_WORKTREE_DIRTY:${dirtyPaths.length}`);
  }
  return true;
}

function main() {
  const rootIndex = process.argv.indexOf("--root");
  const repoRoot = resolve(rootIndex >= 0 ? process.argv[rootIndex + 1] : process.cwd());
  const result = spawnSync("git", [
    "-C", repoRoot,
    "status", "--porcelain=v1", "--untracked-files=all", "--",
    "data", "public/data",
  ], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`SENADO_LOCAL_GIT_STATUS_FAILED:${result.error?.message ?? result.status}`);
  }
  assertCleanWorktree(result.stdout);
  console.log("SENADO_LOCAL_WORKTREE_CLEAN");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
