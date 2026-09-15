import { statfsSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_MIN_FREE_GB = 8;

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

export function getFreeBytes(path = process.cwd()) {
  const stats = statfsSync(resolve(path));
  return Number(stats.bavail) * Number(stats.bsize);
}

export function checkWorkspaceCapacity({ path = process.cwd(), minFreeBytes = DEFAULT_MIN_FREE_GB * 1024 ** 3 } = {}) {
  const freeBytes = getFreeBytes(path);
  return {
    path: resolve(path),
    freeBytes,
    minFreeBytes,
    allowed: freeBytes >= minFreeBytes,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const path = option("--path", process.cwd());
  const minFreeGb = Number(option("--min-free-gb", process.env.CAMBIOMETRO_MIN_FREE_GB ?? DEFAULT_MIN_FREE_GB));
  if (!Number.isFinite(minFreeGb) || minFreeGb <= 0) throw new Error("CPLT_INVALID_MIN_FREE_GB");
  const result = checkWorkspaceCapacity({ path, minFreeBytes: minFreeGb * 1024 ** 3 });
  console.log(JSON.stringify({
    ...result,
    freeGiB: Number((result.freeBytes / 1024 ** 3).toFixed(2)),
    minFreeGiB: minFreeGb,
  }, null, 2));
  if (!result.allowed) {
    throw new Error(`CPLT_WORKSPACE_SPACE_BLOCKED:freeGiB=${(result.freeBytes / 1024 ** 3).toFixed(2)}:requiredGiB=${minFreeGb}`);
  }
}
