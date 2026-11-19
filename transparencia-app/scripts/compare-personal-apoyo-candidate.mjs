import { appendFileSync, readFileSync } from "node:fs";
import { personalApoyoContentChecksum, validatePersonalApoyoDataset, shouldPublishPersonalApoyoCandidate } from "./etl/personal-apoyo-publication.mjs";

function dataset(argument) {
  const index = process.argv.indexOf(argument);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`PERSONAL_APOYO_ARGUMENT_REQUIRED: ${argument}`);
  const value = JSON.parse(readFileSync(process.argv[index + 1], "utf8"));
  validatePersonalApoyoDataset(value);
  return value;
}

const current = dataset("--current");
const candidate = dataset("--candidate");
const currentChecksum = personalApoyoContentChecksum(current);
const candidateChecksum = personalApoyoContentChecksum(candidate);
const changed = shouldPublishPersonalApoyoCandidate(current, candidate);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
console.log(JSON.stringify({ action: changed ? "candidate-changed" : "unchanged", currentChecksum, candidateChecksum, changed }));
