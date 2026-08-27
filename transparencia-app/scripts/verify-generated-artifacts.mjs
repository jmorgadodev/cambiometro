import { execFileSync } from "node:child_process";

const tracked = execFileSync("git", ["ls-files", "-z"], {
  encoding: "utf8",
  cwd: new URL("..", import.meta.url),
}).split("\0").filter(Boolean);

const forbidden = [
  /(^|\/)(?:out|\.next|\.open-next|artifacts|dist)(?:\/|$)/i,
  /(^|\/)public\/data(?:\/|$)/i,
  /(?:^|\/).+\.log$/i,
];

const offenders = tracked.filter((file) => forbidden.some((pattern) => pattern.test(file)));

if (offenders.length > 0) {
  console.error("Generated files must not be committed:");
  for (const file of offenders) console.error(`- ${file}`);
  process.exit(1);
}

console.log(`Generated-artifact guard passed (${tracked.length} tracked files checked).`);
