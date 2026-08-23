import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { requireCloudflareDataCredentials } from "./etl/ci-env.mjs";
import { planR2Publication } from "./etl/r2.mjs";
import { readJsonIfPresent, writeFileAtomic } from "./etl/safe-file.mjs";

function command(binary, args, allowFailure = false) {
  const result = spawnSync(binary, args, { encoding: "utf8", stdio: allowFailure ? "pipe" : "inherit" });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${binary} fallo: ${result.error?.message ?? `codigo ${result.status}`}`);
  }
  return result;
}

function wrangler(args, allowFailure = false) {
  return command(process.execPath, [resolve("node_modules/wrangler/bin/wrangler.js"), ...args, "--remote"], allowFailure);
}

function wranglerWithRetry(args, retries = 3) {
  let attempt = 0;
  while (attempt < retries) {
    attempt += 1;
    const res = wrangler(args, true);
    if (res.status === 0) return res;
    if (attempt === retries) {
      throw new Error(`wrangler ${args.join(" ")} fallo tras ${retries} intentos: ${res.stderr?.trim() ?? `codigo ${res.status}`}`);
    }
    spawnSync(process.execPath, ["-e", `setTimeout(()=>null, ${attempt * 3000})`]);
  }
}

function verifyAsset(outputRoot, metadata) {
  const filePath = join(outputRoot, metadata.key);
  if (!existsSync(filePath)) throw new Error(`PUBLICATION_MISSING_ASSET: ${metadata.key}`);
  const data = readFileSync(filePath);
  if (data.byteLength === 0) throw new Error(`PUBLICATION_EMPTY_ASSET: ${metadata.key}`);
  if (Number.isSafeInteger(metadata.size) && metadata.size !== data.byteLength) {
    throw new Error(`PUBLICATION_SIZE_MISMATCH: ${metadata.key}`);
  }
  const checksumSha256 = createHash("sha256").update(data).digest("hex");
  if (metadata.checksumSha256 !== checksumSha256) {
    throw new Error(`PUBLICATION_CHECKSUM_MISMATCH: ${metadata.key}`);
  }
  return { ...metadata, data };
}

const outputIndex = process.argv.indexOf("--output");
const outputRoot = resolve(outputIndex >= 0 ? process.argv[outputIndex + 1] : "data/lake");
const bucketIndex = process.argv.indexOf("--bucket");
const bucket = bucketIndex >= 0 ? process.argv[bucketIndex + 1] : "transparencia-public-data";
const publishReleases = process.argv.includes("--releases");
const publishR2 = process.argv.includes("--r2");
const allowLocalAuth = process.argv.includes("--local-auth") && !process.env.CI;
if (!publishReleases && !publishR2) throw new Error("Indica --releases, --r2 o ambos");

const planPath = join(outputRoot, "publish-plan.json");
if (!existsSync(planPath)) throw new Error(`No existe ${planPath}; ejecuta npm run data:lake`);
const publishPlan = JSON.parse(readFileSync(planPath, "utf8"));
const assets = publishPlan.assets
  .map((metadata) => verifyAsset(outputRoot, metadata))
  .sort((left, right) => {
    const leftActivatesVersion = left.key.endsWith("/manifest.json");
    const rightActivatesVersion = right.key.endsWith("/manifest.json");
    if (leftActivatesVersion !== rightActivatesVersion) return leftActivatesVersion ? 1 : -1;
    return left.key.localeCompare(right.key);
  });
const oversizedR2Asset = publishR2 && assets.find((asset) => asset.size > 300 * 1024 * 1024);
if (oversizedR2Asset) {
  throw new Error(`R2_OBJECT_EXCEEDS_WRANGLER_LIMIT: ${oversizedR2Asset.key} (${oversizedR2Asset.size} bytes)`);
}

if (publishReleases) {
  if (!process.env.GH_TOKEN?.trim()) throw new Error("PUBLICATION_MISSING_SECRET: GH_TOKEN");
  const releaseStaging = mkdtempSync(join(tmpdir(), "cambiometro-releases-"));
  const grouped = Map.groupBy(assets, (asset) => asset.releaseTag);
  for (const [tag, releaseAssets] of grouped) {
    const releaseView = command("gh", ["release", "view", tag, "--json", "assets"], true);
    let existingAssets = new Map();
    if (releaseView.status !== 0) {
      command("gh", ["release", "create", tag, "--title", tag, "--notes", "Archivo versionado de datos publicos oficiales y proyecciones trazables."]);
    } else {
      const parsed = JSON.parse(releaseView.stdout);
      existingAssets = new Map((parsed.assets ?? []).map((item) => [item.name, item]));
    }
    for (const asset of releaseAssets) {
      const existing = existingAssets.get(asset.releaseAssetName);
      if (existing) {
        if (existing.digest === `sha256:${asset.checksumSha256}`) continue;
        throw new Error(`IMMUTABLE_RELEASE_CONFLICT: ${tag}/${asset.releaseAssetName}`);
      }
      const stagedPath = join(releaseStaging, asset.releaseAssetName);
      copyFileSync(join(outputRoot, asset.key), stagedPath);
      let attempts = 0;
      while (attempts < 3) {
        attempts += 1;
        const result = command("gh", ["release", "upload", tag, stagedPath], true);
        if (result.status === 0) break;
        if (attempts === 3) throw new Error(`gh release upload fallo tras 3 intentos: codigo ${result.status} ${result.stderr?.trim() ? `(${result.stderr.trim()})` : ""}`);
        spawnSync(process.execPath, ["-e", "setTimeout(()=>null, 5000)"]);
      }
    }
  }
}

if (publishR2) {
  if (!allowLocalAuth) requireCloudflareDataCredentials();
  const r2Staging = mkdtempSync(join(tmpdir(), "cambiometro-r2-"));
  const inventoryPath = join(r2Staging, "storage.json");
  const inventoryKey = "catalog/v1/storage.json";
  const downloaded = wrangler(["r2", "object", "get", `${bucket}/${inventoryKey}`, "--file", inventoryPath], true);
  const previous = downloaded.status === 0
    ? readJsonIfPresent(inventoryPath, { objects: [] })
    : { objects: [] };
  const r2Plan = planR2Publication(assets, previous);
  const activationManifests = r2Plan.puts.filter((asset) => asset.key.endsWith("/manifest.json"));

  for (const asset of r2Plan.puts.filter((item) => !activationManifests.includes(item))) {
    wranglerWithRetry(["r2", "object", "put", `${bucket}/${asset.key}`, "--file", join(outputRoot, asset.key)]);
  }
  for (const key of r2Plan.deletes) wranglerWithRetry(["r2", "object", "delete", `${bucket}/${key}`]);
  for (const manifest of activationManifests) {
    wranglerWithRetry(["r2", "object", "put", `${bucket}/${manifest.key}`, "--file", join(outputRoot, manifest.key), "--content-type", "application/json"]);
  }

  writeFileAtomic(inventoryPath, `${JSON.stringify(r2Plan.inventory, null, 2)}\n`, "utf8");
  wranglerWithRetry(["r2", "object", "put", `${bucket}/${inventoryKey}`, "--file", inventoryPath, "--content-type", "application/json"]);
  console.log(JSON.stringify({
    action: r2Plan.action,
    usedBytes: r2Plan.projectedBytes,
    limitBytes: r2Plan.limitBytes,
    puts: r2Plan.puts.length,
    deletes: r2Plan.deletes.length,
  }, null, 2));
}
