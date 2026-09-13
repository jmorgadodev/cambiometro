import { spawnSync } from "node:child_process";

const npm = process.platform === "win32" ? "npm" : "npm";
const env = { ...process.env, CAMBIOMETRO_PUBLISHED_RELEASE_ONLY: "1" };

function run(command, args, shell = process.platform === "win32") {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell,
    env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  return result.status;
}

if (run(process.execPath, ["scripts/rebuild-authoritative-municipalidades.mjs"], false) === 0) {
  run(npm, ["run", "pages:build"]);
}
