import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { personalApoyoContentChecksum, personalApoyoHistoryChanges, validatePersonalApoyoDataset } from "./etl/personal-apoyo-publication.mjs";
import { verifyPersonalApoyoRelease } from "./etl/personal-apoyo-release.mjs";
import { buildReleaseSet } from "./release-set.mjs";

const root = resolve(import.meta.dirname, "..");
const sources = ["camara-support", "camara-advisories", "senado-support"];
export function reviewPersonalApoyoCandidate(current, candidate, source, minimums) {
  if (!sources.includes(source)) throw new Error("PERSONAL_CANDIDATE_SOURCE_INVALID");
  const baselineCounts = validatePersonalApoyoDataset(current, minimums);
  const candidateCounts = validatePersonalApoyoDataset(candidate, minimums);
  const baselineChecksum = personalApoyoContentChecksum(current);
  const candidateChecksum = personalApoyoContentChecksum(candidate);
  const history = personalApoyoHistoryChanges(current, candidate);
  const outsideScope = [...history.losses, ...history.revisions, ...history.additions].filter(change => change.kind !== source);
  const reasons = [];
  if (history.losses.length) reasons.push("published-history-loss");
  if (history.revisions.length) reasons.push("published-period-revised");
  if (outsideScope.length) reasons.push("another-source-changed");
  if (baselineChecksum !== candidateChecksum && !history.revisions.length && !history.additions.length && !history.losses.length) reasons.push("change-outside-monthly-records");
  return { schemaVersion: 1, source, generatedAt: new Date().toISOString(), automaticPublication: false,
    status: baselineChecksum === candidateChecksum ? "unchanged" : reasons.length ? "requires-review" : "prepared",
    baselineContentChecksumSha256: baselineChecksum, candidateContentChecksumSha256: candidateChecksum,
    baselineCounts, candidateCounts, ...history, outsideScope, reasons };
}

export function main(args = process.argv.slice(2)) {
  if (args.length === 1 && args[0] === "--help") {
    console.log("Preparación local, sin red ni publicación: --manifest <json publicado> --baseline <personal-apoyo.json> --candidate <json> --source <camara-support|camara-advisories|senado-support> --output <directorio nuevo bajo artifacts/personal-candidates>");
    return 0;
  }
  const options = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]; const value = args[index + 1];
    if (!["--manifest", "--baseline", "--candidate", "--source", "--output"].includes(key) || options.has(key) || !value || value.startsWith("--")) throw new Error("PERSONAL_CANDIDATE_ARGUMENTS_INVALID");
    options.set(key, value);
  }
  if (options.size !== 5) throw new Error("PERSONAL_CANDIDATE_ARGUMENTS_REQUIRED");
  const output = resolve(root, options.get("--output"));
  const within = relative(resolve(root, "artifacts/personal-candidates"), output);
  if (!within || isAbsolute(within) || within === ".." || within.startsWith(`..${sep}`) || existsSync(output)) throw new Error("PERSONAL_CANDIDATE_OUTPUT_UNSAFE_OR_EXISTS");
  const bytes = readFileSync(resolve(root, options.get("--baseline")));
  const manifest = JSON.parse(readFileSync(resolve(root, options.get("--manifest")), "utf8"));
  let baseline;
  if (manifest.sourceId === "personal-apoyo") baseline = verifyPersonalApoyoRelease(bytes, manifest).dataset;
  else {
    buildReleaseSet(manifest);
    const file = manifest.files.find(file => file.path === "data/personal-apoyo.json");
    if (!file || file.size !== bytes.length || file.checksumSha256 !== createHash("sha256").update(bytes).digest("hex")) throw new Error("PERSONAL_CANDIDATE_BASELINE_CHECKSUM_MISMATCH");
    baseline = JSON.parse(bytes.toString("utf8"));
  }
  const candidateBytes = readFileSync(resolve(root, options.get("--candidate")));
  const candidate = JSON.parse(candidateBytes.toString("utf8"));
  const review = reviewPersonalApoyoCandidate(baseline, candidate, options.get("--source"));
  review.baselineFileChecksumSha256 = createHash("sha256").update(bytes).digest("hex");
  review.candidateFileChecksumSha256 = createHash("sha256").update(candidateBytes).digest("hex");
  mkdirSync(dirname(output), { recursive: true }); mkdirSync(output);
  writeFileSync(resolve(output, "candidate.json"), candidateBytes, { flag: "wx" });
  writeFileSync(resolve(output, "review.json"), JSON.stringify(review, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ status: review.status, source: review.source, automaticPublication: false, output, reasons: review.reasons }));
  return review.status === "requires-review" ? 2 : 0;
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  try { process.exitCode = main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
