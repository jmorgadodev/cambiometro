import { execFileSync } from "child_process";

console.warn("seed-d1-from-json.ts es un alias heredado; la escritura HTTP fue retirada.");
execFileSync(
  process.execPath,
  ["scripts/materialize-d1.mjs", ...process.argv.slice(2)],
  { stdio: "inherit", env: process.env }
);
