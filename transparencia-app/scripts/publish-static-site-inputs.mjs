import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  assertStaticInputManifest,
  buildStaticInputEntries,
  buildStaticInputManifest,
  parseRequestedStaticFiles,
  resolveSafeStaticPath,
  sha256Buffer,
} from "./static-site-inputs.mjs";
import { requireCloudflareDataCredentials } from "./etl/ci-env.mjs";

const root = resolve(import.meta.dirname, "..");
const bucket = argument("--bucket", "transparencia-public-data");
const manifestKey = "projections/static-site-v1/manifest.json";
const output = resolve(argument("--output", "data/static-site-release"));
const requestedGroups = argument("--groups", "").split(",").map((value) => value.trim()).filter(Boolean);
const requestedFiles = argument("--files", "").split(",").map((value) => value.trim()).filter(Boolean);
const localOnly = process.argv.includes("--local-only");
const allowLocalAuth = process.argv.includes("--local-auth") && !process.env.CI;

function argument(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function runWrangler(args, allowFailure = false) {
  const bin = resolve(root, "node_modules/wrangler/bin/wrangler.js");
  const result = spawnSync(process.execPath, [bin, ...args, "--remote"], {
    cwd: root,
    encoding: "utf8",
    stdio: allowFailure ? "pipe" : "inherit",
  });
  if (!allowFailure && result.status !== 0) throw new Error(`WRANGLER_FAILED:${args.join(" ")}`);
  return result;
}

function readRemoteManifest() {
  const target = join(output, "remote-manifest.json");
  const result = runWrangler(["r2", "object", "get", `${bucket}/${manifestKey}`, "--file", target], true);
  if (result.status !== 0 || !existsSync(target)) return null;
  return JSON.parse(readFileSync(target, "utf8"));
}

const files = parseRequestedStaticFiles({ files: requestedFiles, groups: requestedGroups });
const releaseId = sha256Buffer(Buffer.from(files.map((file) => {
  const path = resolveSafeStaticPath(root, file);
  if (!existsSync(path)) throw new Error(`STATIC_INPUT_MISSING: ${file}`);
  return `${file}:${sha256Buffer(readFileSync(path))}`;
}).join("\n"), "utf8"));
const freshEntries = buildStaticInputEntries({ root, files, releaseId });
let manifest = buildStaticInputManifest({ entries: freshEntries });

if (!localOnly) {
  if (!allowLocalAuth) requireCloudflareDataCredentials();
  mkdirSync(output, { recursive: true });
  const previous = readRemoteManifest();
  if (previous) assertStaticInputManifest(previous);
  const merged = new Map((previous?.files ?? []).map((file) => [file.path, file]));
  for (const file of freshEntries) merged.set(file.path, file);
  manifest = buildStaticInputManifest({ entries: [...merged.values()] });
  const releaseDir = join(output, "releases", releaseId);
  mkdirSync(releaseDir, { recursive: true });
  for (const entry of freshEntries) {
    const source = resolveSafeStaticPath(root, entry.path);
    const staged = join(releaseDir, entry.path.replaceAll("/", "__"));
    writeFileSync(staged, readFileSync(source));
    runWrangler(["r2", "object", "put", `${bucket}/${entry.key}`, "--file", staged, "--content-type", "application/json"]);
  }
  const manifestPath = join(output, "manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  runWrangler(["r2", "object", "put", `${bucket}/${manifestKey}`, "--file", manifestPath, "--content-type", "application/json"]);
} else {
  mkdirSync(output, { recursive: true });
  writeFileSync(join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify({
  action: localOnly ? "local-only" : "published",
  bucket: localOnly ? null : bucket,
  manifestKey: localOnly ? null : manifestKey,
  releaseId,
  files: manifest.files.length,
  updatedFiles: freshEntries.length,
  checksumSha256: manifest.checksumSha256,
}, null, 2));
