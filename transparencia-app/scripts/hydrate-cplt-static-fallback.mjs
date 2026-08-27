import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const bucket = argument("--bucket", "transparencia-public-data");
const required = process.argv.includes("--required");
const remoteManifestKey = "projections/funcionarios-v1/manifest.json";
const outputRoot = join(root, "data", "lake-cplt", "projections", "funcionarios-v1");
const downloadTimeoutMs = Number(process.env.CPLT_R2_DOWNLOAD_TIMEOUT_MS ?? 180_000);
const downloadAttempts = Number(process.env.CPLT_R2_DOWNLOAD_ATTEMPTS ?? 3);
const retryDelayMs = Number(process.env.CPLT_R2_RETRY_DELAY_MS ?? 2_000);

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function runWrangler(args, { allowFailure = false, timeoutMs = downloadTimeoutMs } = {}) {
  const bin = resolve(root, "node_modules/wrangler/bin/wrangler.js");
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [bin, ...args, "--remote"], {
      cwd: root,
      stdio: allowFailure ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";
    if (allowFailure) {
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
    }
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`CPLT_R2_COMMAND_TIMEOUT: ${args.join(" ")}`));
    }, timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolvePromise({ status: 0, stdout, stderr });
      else if (allowFailure) resolvePromise({ status: code ?? 1, stdout, stderr });
      else reject(new Error(`WRANGLER_FAILED:${args.join(" ")}`));
    });
  });
}

async function downloadObject(key, destination, expectedSize, expectedChecksum) {
  mkdirSync(join(destination, ".."), { recursive: true });
  let lastError;
  for (let attempt = 1; attempt <= downloadAttempts; attempt += 1) {
    try {
      console.log(`[cplt] descarga ${key} (${attempt}/${downloadAttempts})`);
      await runWrangler(["r2", "object", "get", `${bucket}/${key}`, "--file", destination]);
      const content = readFileSync(destination);
      if (content.byteLength !== expectedSize || sha256(content) !== expectedChecksum) {
        throw new Error(`CPLT_STATIC_CHECKSUM_MISMATCH:${key}`);
      }
      return;
    } catch (error) {
      lastError = error;
      rmSync(destination, { force: true });
      if (attempt < downloadAttempts) {
        await new Promise((resolvePromise) => setTimeout(resolvePromise, retryDelayMs * attempt));
      }
    }
  }
  throw lastError;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function validateManifest(manifest) {
  if (manifest?.schemaVersion !== "1.0.0" || manifest.sourceId !== "transparencia-activa") {
    throw new Error("CPLT_STATIC_MANIFEST_INVALID");
  }
  if (!manifest.version || !Array.isArray(manifest.assets) || manifest.assets.length < 1) {
    throw new Error("CPLT_STATIC_MANIFEST_EMPTY");
  }
  if (!Array.isArray(manifest.coverage) || manifest.coverage.length !== 346) {
    throw new Error(`CPLT_STATIC_COVERAGE_INVALID:${manifest.coverage?.length ?? 0}`);
  }
  for (const asset of manifest.assets) {
    if (!/^projections\/funcionarios-v1\/versions\/[^/]+\/[A-Za-z0-9._-]+\.json$/.test(asset.key ?? "")) {
      throw new Error(`CPLT_STATIC_ASSET_KEY_INVALID:${asset.key}`);
    }
    if (!Number.isSafeInteger(asset.size) || asset.size < 2 || !/^[a-f0-9]{64}$/i.test(asset.checksumSha256 ?? "")) {
      throw new Error(`CPLT_STATIC_ASSET_METADATA_INVALID:${asset.key}`);
    }
  }
  return manifest;
}

const temporaryRoot = mkdtempSync(join(tmpdir(), "cambiometro-cplt-static-"));
try {
  const remoteManifest = join(temporaryRoot, "manifest.json");
  const result = await runWrangler(["r2", "object", "get", `${bucket}/${remoteManifestKey}`, "--file", remoteManifest], { allowFailure: true });
  if (result.status !== 0 || !existsSync(remoteManifest)) {
    if (required) throw new Error("CPLT_STATIC_REMOTE_MANIFEST_MISSING");
    console.log(JSON.stringify({ action: "skipped", reason: "remote-manifest-missing" }));
    process.exit(0);
  }

  const manifest = validateManifest(JSON.parse(readFileSync(remoteManifest, "utf8")));
  const versionRoot = join(outputRoot, "versions", manifest.version);
  rmSync(versionRoot, { recursive: true, force: true });
  mkdirSync(versionRoot, { recursive: true });

  for (const asset of manifest.assets) {
    const fileName = asset.key.split("/").at(-1);
    const target = join(versionRoot, fileName);
    const downloaded = `${target}.download`;
    await downloadObject(asset.key, downloaded, asset.size, asset.checksumSha256);
    writeFileSync(target, readFileSync(downloaded));
    rmSync(downloaded, { force: true });
  }

  mkdirSync(outputRoot, { recursive: true });
  writeFileSync(join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ action: "hydrated", version: manifest.version, files: manifest.assets.length, coverage: manifest.coverage.length }, null, 2));
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
