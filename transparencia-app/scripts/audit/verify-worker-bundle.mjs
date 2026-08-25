#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const wranglerArgs = [
  "wrangler",
  "deploy",
  "--config",
  "workers/public-api/wrangler.jsonc",
  "--dry-run",
  "--outdir",
  ".dist",
];
const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "npx";
const args = process.platform === "win32"
  ? ["/d", "/s", "/c", `npx ${wranglerArgs.join(" ")}`]
  : wranglerArgs;
const result = spawnSync(command, args, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
process.stdout.write(output);
if (result.error || result.status !== 0) {
  console.error("\nFAIL: Wrangler no pudo generar el dry-run del Worker.");
  process.exit(1);
}

const match = output.match(/Total Upload:\s*([\d.]+)\s*(KiB|MiB)/i);
if (!match) {
  console.error("\nFAIL: no se encontró 'Total Upload' en la salida de Wrangler; no se puede aprobar el tamaño.");
  process.exit(1);
}

const amount = Number(match[1]);
const unit = match[2].toLowerCase();
const bytes = unit === "mib" ? amount * 1024 * 1024 : amount * 1024;
const limit = 1024 * 1024;
console.log(`[worker-bundle] upload=${Math.round(bytes)} bytes (${(bytes / 1024).toFixed(2)} KiB), limit=${limit} bytes`);

if (bytes >= limit) {
  console.error("FAIL: el bundle del Worker debe ser menor a 1 MiB.");
  process.exit(1);
}

console.log("OK: bundle del Worker bajo 1 MiB.");
