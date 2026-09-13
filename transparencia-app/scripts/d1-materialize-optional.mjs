import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { classifyD1MaterializationFailure, summaryForD1Deferral } from "./d1-materialization-policy.mjs";

const args = process.argv.slice(2);
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npm, ["run", "data:materialize", "--", ...args], {
  encoding: "utf8",
  stdio: ["inherit", "pipe", "pipe"],
});
const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");

if (result.status === 0) process.exit(0);

const reason = classifyD1MaterializationFailure(output);
if (!reason) process.exit(result.status ?? 1);

const sourcesIndex = args.indexOf("--sources");
const sources = sourcesIndex >= 0 ? args[sourcesIndex + 1] || "unspecified" : "unspecified";
const summary = summaryForD1Deferral(reason, sources);
console.warn(`[d1-materialize-optional] ${summary.replaceAll("\n", " ")}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}
process.exit(0);
