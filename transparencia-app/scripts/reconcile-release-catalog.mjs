import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { reconcileReleaseCatalog } from "./etl/reconcile-release-catalog.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const input = argument("--catalog");
const output = argument("--output");
if (!input || !output) throw new Error("Uso: node scripts/reconcile-release-catalog.mjs --catalog <manifest.json> --output <lake-dir>");
const inputPath = resolve(input);
const outputRoot = resolve(output);
if (!existsSync(inputPath)) throw new Error(`RECOVERY_CATALOG_NOT_FOUND: ${inputPath}`);
if (existsSync(outputRoot)) throw new Error(`RECOVERY_OUTPUT_ALREADY_EXISTS: ${outputRoot}`);

const catalog = JSON.parse(readFileSync(inputPath, "utf8"));
const manifestsById = new Map();
const work = mkdtempSync(join(tmpdir(), "cambiometro-release-recovery-"));

try {
  for (const partition of catalog.partitions ?? []) {
    const [year, month] = String(partition.period).split("-");
    const assetName = `${partition.sourceId}-${year}-${month}-manifest.json`;
    const releaseDir = join(work, partition.releaseTag);
    mkdirSync(releaseDir, { recursive: true });
    const result = spawnSync("gh", ["release", "download", partition.releaseTag, "--pattern", assetName, "--dir", releaseDir, "--clobber"], {
      encoding: "utf8",
      stdio: "pipe",
    });
    if (result.status !== 0) throw new Error(`RECOVERY_DOWNLOAD_FAILED: ${partition.releaseTag}/${assetName}`);
    const manifestPath = join(releaseDir, assetName);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifestsById.set(partition.id, manifest);
    const preservedPath = resolve(outputRoot, partition.manifestKey);
    if (!preservedPath.startsWith(`${outputRoot}\\`) && !preservedPath.startsWith(`${outputRoot}/`)) {
      throw new Error(`RECOVERY_INVALID_MANIFEST_KEY: ${partition.manifestKey}`);
    }
    mkdirSync(dirname(preservedPath), { recursive: true });
    copyFileSync(manifestPath, preservedPath);
  }

  const reconciled = reconcileReleaseCatalog(catalog, manifestsById);
  const catalogPath = join(outputRoot, "catalog", "v1", "manifest.json");
  mkdirSync(dirname(catalogPath), { recursive: true });
  writeFileSync(catalogPath, `${JSON.stringify(reconciled.catalog, null, 2)}\n`, "utf8");
  writeFileSync(join(outputRoot, "recovery-report.json"), `${JSON.stringify(reconciled.report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ output: outputRoot, ...reconciled.report }, null, 2));
} finally {
  rmSync(work, { recursive: true, force: true });
}
