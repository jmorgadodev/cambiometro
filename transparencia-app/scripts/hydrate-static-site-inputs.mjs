import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { assertStaticInputContentQuality, assertStaticInputManifest, assertStaticInputManifestComplete, resolveSafeStaticPath, sha256Buffer } from "./static-site-inputs.mjs";

const root = resolve(import.meta.dirname, "..");
const bucket = argument("--bucket", "transparencia-public-data");
const required = process.argv.includes("--required");
const requiredAll = process.argv.includes("--required-all");
const requiredFiles = argument("--required-files", "").split(",").map((value) => value.trim()).filter(Boolean);
const manifestFile = argument("--manifest-file", "");
const localManifestPath = manifestFile ? resolve(root, manifestFile) : resolve(root, ".static-site-release-manifest.json");
const remoteKey = "projections/static-site-v1/manifest.json";

function readExistingManifest() {
  if (!existsSync(localManifestPath)) return null;
  try {
    return JSON.parse(readFileSync(localManifestPath, "utf8"));
  } catch {
    return null;
  }
}

function argument(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function wrangler(args, allowFailure = false) {
  const bin = resolve(root, "node_modules/wrangler/bin/wrangler.js");
  const result = spawnSync(process.execPath, [bin, ...args, "--remote"], {
    cwd: root,
    encoding: "utf8",
    stdio: allowFailure ? "pipe" : "inherit",
  });
  if (!allowFailure && result.status !== 0) throw new Error(`WRANGLER_FAILED:${args.join(" ")}`);
  return result;
}

let manifest;
if (manifestFile) {
  if (!existsSync(localManifestPath)) throw new Error(`STATIC_INPUT_MANIFEST_MISSING: ${manifestFile}`);
  manifest = JSON.parse(readFileSync(localManifestPath, "utf8"));
} else {
  const temporary = resolve(root, ".static-site-release-manifest.download.json");
  const result = wrangler(["r2", "object", "get", `${bucket}/${remoteKey}`, "--file", temporary], true);
  if (result.status !== 0 || !existsSync(temporary)) {
    rmSync(temporary, { force: true });
    if (required) throw new Error("STATIC_INPUT_REMOTE_MANIFEST_MISSING");
    console.log(JSON.stringify({ action: "skipped", reason: "remote-manifest-missing" }));
    process.exit(0);
  }
  manifest = JSON.parse(readFileSync(temporary, "utf8"));
  rmSync(temporary, { force: true });
}

assertStaticInputManifest(manifest);
if (requiredAll) assertStaticInputManifestComplete(manifest);
const availableFiles = new Set(manifest.files.map((entry) => entry.path));
const existingManifest = readExistingManifest();
const existingFiles = new Map((existingManifest?.files ?? []).map((entry) => [entry.path, entry]));
for (const requiredFile of requiredFiles) {
  if (!availableFiles.has(requiredFile)) throw new Error(`STATIC_INPUT_REQUIRED_FILE_MISSING: ${requiredFile}`);
}
for (const entry of manifest.files) {
  const target = resolveSafeStaticPath(root, entry.path);
  mkdirSync(dirname(target), { recursive: true });
  const existing = existingFiles.get(entry.path);
  if (existing?.size === entry.size && existing.checksumSha256 === entry.checksumSha256 && existsSync(target)) {
    const current = readFileSync(target);
    if (current.byteLength === entry.size && sha256Buffer(current) === entry.checksumSha256) continue;
  }
  const temporary = `${target}.download`;
  wrangler(["r2", "object", "get", `${bucket}/${entry.key}`, "--file", temporary]);
  const data = readFileSync(temporary);
  if (data.byteLength !== entry.size || sha256Buffer(data) !== entry.checksumSha256) {
    rmSync(temporary, { force: true });
    throw new Error(`STATIC_INPUT_CHECKSUM_MISMATCH: ${entry.path}`);
  }
  assertStaticInputContentQuality(entry.path, data);
  writeFileSync(target, data);
  rmSync(temporary, { force: true });
}
writeFileSync(localManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ action: "hydrated", files: manifest.files.length, checksumSha256: manifest.checksumSha256 }, null, 2));
