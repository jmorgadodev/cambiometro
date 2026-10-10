import { appendFileSync, readFileSync } from "node:fs";
import { personalApoyoContentChecksum, validatePersonalApoyoDataset } from "./etl/personal-apoyo-publication.mjs";

function dataset(argument) {
  const index = process.argv.indexOf(argument);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`PERSONAL_APOYO_ARGUMENT_REQUIRED: ${argument}`);
  const value = JSON.parse(readFileSync(process.argv[index + 1], "utf8"));
  validatePersonalApoyoDataset(value);
  return value;
}

const currentChecksum = personalApoyoContentChecksum(dataset("--current"));
const candidateChecksum = personalApoyoContentChecksum(dataset("--candidate"));
const changed = currentChecksum !== candidateChecksum;
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
console.log(JSON.stringify({ action: changed ? "candidate-changed" : "unchanged", currentChecksum, candidateChecksum, changed }));
