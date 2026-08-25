#!/usr/bin/env node

import { access, cp, rename, rm } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const appRoot = process.cwd();
const currentConfig = path.join(appRoot, "next.config.ts");
const rollbackConfig = path.join(appRoot, "next.config.opennext.ts");
const backupConfig = path.join(appRoot, ".next.config.pages-backup.ts");
const nextBin = process.platform === "win32"
  ? path.join(appRoot, "node_modules", ".bin", "opennextjs-cloudflare.cmd")
  : path.join(appRoot, "node_modules", ".bin", "opennextjs-cloudflare");

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(nextBin, args, {
      cwd: appRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`OpenNext terminó con ${code ?? signal}`));
    });
  });
}

if (!(await exists(currentConfig)) || !(await exists(rollbackConfig))) {
  throw new Error("ROLLBACK_NEXT_CONFIG_MISSING");
}
if (await exists(backupConfig)) await rm(backupConfig, { force: true });

let switched = false;
try {
  await rename(currentConfig, backupConfig);
  await cp(rollbackConfig, currentConfig);
  switched = true;
  console.log("[open-next-rollback] usando next.config.opennext.ts");
  await run(["build"]);
} finally {
  if (switched) {
    await rm(currentConfig, { force: true });
    await rename(backupConfig, currentConfig);
    console.log("[open-next-rollback] next.config.ts restaurado");
  }
}
