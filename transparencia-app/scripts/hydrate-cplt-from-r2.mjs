#!/usr/bin/env node

/** Descarga la publicación CPLT versionada de R2 para el build Pages. */

import { mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, join, resolve } from "node:path";
import { spawn } from "node:child_process";

const bucket = process.env.CPLT_R2_BUCKET ?? "transparencia-public-data";
const root = resolve("data/lake-cplt/projections/funcionarios-v1");
const manifestPath = join(root, "manifest.json");

function runWrangler(args) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, ["wrangler", ...args], { stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolvePromise() : reject(new Error(`wrangler terminó con ${code}`)));
  });
}

async function main() {
  mkdirSync(root, { recursive: true });
  await runWrangler(["r2", "object", "get", `${bucket}/projections/funcionarios-v1/manifest.json`, "--file", manifestPath, "--remote"]);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const assets = (manifest.assets ?? []).filter((asset) => asset.key.endsWith(".json") && !asset.key.endsWith("/manifest.json"));
  const allowUnavailable = process.env.CPLT_ALLOW_UNAVAILABLE === "1";
  if (!allowUnavailable && assets.length !== 346) {
    throw new Error(`CPLT_R2_ASSET_COUNT_INVALID: esperaba 346 y encontré ${assets.length}`);
  }
  if (allowUnavailable && (assets.length === 0 || assets.length > 346)) {
    throw new Error(`CPLT_R2_ASSET_COUNT_INVALID: encontré ${assets.length} particiones para un censo de 346`);
  }
  if (!Array.isArray(manifest.coverage) || manifest.coverage.length !== 346 || manifest.coverageSummary?.censusComplete !== true) {
    throw new Error("CPLT_R2_COVERAGE_CENSUS_INVALID");
  }
  const versionRoot = join(root, "versions", manifest.version);
  rmSync(versionRoot, { recursive: true, force: true });
  mkdirSync(versionRoot, { recursive: true });

  const queue = [...assets];
  const workers = Array.from({ length: Math.min(8, queue.length) }, async () => {
    while (queue.length > 0) {
      const asset = queue.shift();
      if (!asset) return;
      const destination = join(versionRoot, basename(asset.key));
      await runWrangler(["r2", "object", "get", `${bucket}/${asset.key}`, "--file", destination, "--remote"]);
      const checksum = createHash("sha256").update(readFileSync(destination)).digest("hex");
      if (asset.checksumSha256 && checksum !== asset.checksumSha256) {
        throw new Error(`CPLT_R2_CHECKSUM_INVALID: ${asset.key}`);
      }
      const records = JSON.parse(readFileSync(destination, "utf8"));
      if (!Array.isArray(records)) throw new Error(`CPLT_R2_PARTITION_INVALID: ${asset.key}`);
    }
  });
  await Promise.all(workers);
  const downloaded = readdirSync(versionRoot).filter((name) => name.endsWith(".json"));
  if (downloaded.length !== assets.length) throw new Error(`CPLT_R2_DOWNLOAD_COUNT_INVALID: esperaba ${assets.length} y descargué ${downloaded.length}`);
  console.log(JSON.stringify({ bucket, version: manifest.version, partitions: downloaded.length, census: 346, allowUnavailable, generatedAt: manifest.generatedAt }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
