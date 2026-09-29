import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { personalApoyoStaticSubset, verifyPersonalApoyoRelease } from "./etl/personal-apoyo-release.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`PERSONAL_APOYO_ARGUMENT_REQUIRED:${name}`);
  return resolve(process.argv[index + 1]);
}

const manifest = JSON.parse(readFileSync(argument("--manifest"), "utf8"));
const input = readFileSync(argument("--input"));
const { dataset, counts, checksum } = verifyPersonalApoyoRelease(input, manifest);
writeFileSync(argument("--output"), input);
writeFileSync(argument("--subset"), JSON.stringify(personalApoyoStaticSubset(dataset)));
console.log(JSON.stringify({ action: "personal-apoyo-canonical-verified", ...counts, checksumSha256: checksum }));
