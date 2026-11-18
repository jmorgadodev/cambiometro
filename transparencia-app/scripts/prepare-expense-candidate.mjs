import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { prepareExpenseCandidate } from "./etl/expense-candidate.mjs";

const root = resolve(import.meta.dirname, "..");

export function expenseCandidateDirectory(path, workspaceRoot = root) {
  if (!path) throw new Error("EXPENSE_CANDIDATE_OUTPUT_REQUIRED");
  const target = resolve(workspaceRoot, path);
  const base = resolve(workspaceRoot, "artifacts", "expense-candidates");
  const child = relative(base, target);
  if (!child || isAbsolute(child) || child === ".." || child.startsWith(`..${sep}`)) throw new Error("EXPENSE_CANDIDATE_OUTPUT_OUTSIDE_ARTIFACTS");
  if (existsSync(target)) throw new Error("EXPENSE_CANDIDATE_OUTPUT_EXISTS");
  return target;
}

export function writeExpenseCandidateArtifacts(result, outputDirectory) {
  const target = expenseCandidateDirectory(outputDirectory);
  mkdirSync(dirname(target), { recursive: true });
  mkdirSync(target);
  writeFileSync(resolve(target, "candidate.subset.json"), JSON.stringify(result.candidate, null, 2) + "\n", { flag: "wx" });
  writeFileSync(resolve(target, "review.json"), JSON.stringify(result.review, null, 2) + "\n", { flag: "wx" });
  return target;
}

export function prepareExpenseCandidateFiles({ baselineFile, incomingFile, scopeFile, outputDirectory }) {
  expenseCandidateDirectory(outputDirectory);
  const files = [baselineFile, incomingFile, scopeFile].map(path => {
    if (!path) throw new Error("EXPENSE_CANDIDATE_INPUT_REQUIRED");
    const resolved = resolve(root, path);
    const bytes = readFileSync(resolved);
    return { path: resolved, checksumSha256: createHash("sha256").update(bytes).digest("hex"), payload: JSON.parse(bytes.toString("utf8")) };
  });
  const [baseline, incoming, scope] = files;
  if (!Array.isArray(incoming.payload) && incoming.payload?.sourceId !== baseline.payload?.sourceId) throw new Error("EXPENSE_CANDIDATE_SOURCE_MISMATCH");
  const result = prepareExpenseCandidate({ baseline: baseline.payload, incoming: Array.isArray(incoming.payload) ? incoming.payload : incoming.payload.records, scope: scope.payload });
  result.review.inputs = files.map(({ path, checksumSha256 }) => ({ path, checksumSha256 }));
  const output = writeExpenseCandidateArtifacts(result, outputDirectory);
  return { ...result, output };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  try {
    const args = process.argv.slice(2);
    const allowed = new Set(["--baseline", "--incoming", "--scope", "--output-dir"]);
    const options = {};
    for (let index = 0; index < args.length; index += 2) {
      if (!allowed.has(args[index]) || !args[index + 1] || args[index + 1].startsWith("--") || options[args[index]]) throw new Error("EXPENSE_CANDIDATE_ARGUMENTS_INVALID");
      options[args[index]] = args[index + 1];
    }
    const result = prepareExpenseCandidateFiles({ baselineFile: options["--baseline"], incomingFile: options["--incoming"], scopeFile: options["--scope"], outputDirectory: options["--output-dir"] });
    console.log(JSON.stringify({ status: result.review.status, automaticPublication: false, output: result.output, reasons: result.review.reasons }, null, 2));
    if (result.review.status === "requires-review") process.exitCode = 2;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
