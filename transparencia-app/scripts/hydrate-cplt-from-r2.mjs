#!/usr/bin/env node

/** Descarga la publicación CPLT versionada de R2 para el build Pages. */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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
  const canonicalPath = resolve("data/catalog/communes.json");
  const canonical = existsSync(canonicalPath) ? JSON.parse(readFileSync(canonicalPath, "utf8")).communes ?? [] : [];
  const canonicalIds = canonical.map((commune) => commune.id).filter(Boolean);
  if (canonicalIds.length !== 346 || new Set(canonicalIds).size !== 346) {
    throw new Error(`CPLT_CANONICAL_CENSUS_INVALID: esperaba 346 ids únicos y encontré ${canonicalIds.length}`);
  }
  if (!allowUnavailable && assets.length !== 346) {
    throw new Error(`CPLT_R2_ASSET_COUNT_INVALID: esperaba 346 y encontré ${assets.length}`);
  }
  if (allowUnavailable && (assets.length === 0 || assets.length > 346)) {
    throw new Error(`CPLT_R2_ASSET_COUNT_INVALID: encontré ${assets.length} particiones para un censo de 346`);
  }
  const coverageIsValid = Array.isArray(manifest.coverage)
    && manifest.coverage.length === 346
    && manifest.coverageSummary?.censusComplete === true;
  if (!coverageIsValid && !allowUnavailable) {
    throw new Error("CPLT_R2_COVERAGE_CENSUS_INVALID");
  }
  if (!coverageIsValid) {
    console.warn("CPLT_R2_COVERAGE_METADATA_INCOMPLETE: se usará el catálogo canónico y se marcarán faltantes como unavailable");
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
  const missing = canonicalIds.filter((id) => !existsSync(join(versionRoot, `${id}.json`)));
  if (missing.length > 0 && !allowUnavailable) {
    throw new Error(`CPLT_R2_CANONICAL_PARTITIONS_MISSING: ${missing.length}`);
  }
  for (const id of missing) writeFileSync(join(versionRoot, `${id}.json`), "[]\n", "utf8");
  const materialized = readdirSync(versionRoot).filter((name) => name.endsWith(".json"));
  if (materialized.length !== 346) throw new Error(`CPLT_R2_CANONICAL_MATERIALIZATION_INVALID: ${materialized.length}`);
  console.log(JSON.stringify({ bucket, version: manifest.version, partitions: downloaded.length, placeholders: missing.length, census: 346, allowUnavailable, generatedAt: manifest.generatedAt }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
