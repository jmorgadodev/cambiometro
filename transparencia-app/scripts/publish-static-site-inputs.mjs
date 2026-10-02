import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  assertStaticInputManifest,
  assertStaticInputContentQuality,
  buildStaticInputEntries,
  buildStaticInputManifest,
  omitRetainedExpenseSubsets,
  parseRequestedStaticFiles,
  resolveSafeStaticPath,
  sha256Buffer,
} from "./static-site-inputs.mjs";
import { requireCloudflareDataCredentials } from "./etl/ci-env.mjs";
import { assertRemoteR2WriteBudget, configuredR2BudgetBuckets } from "./etl/r2-account-budget.mjs";
import { writeExpensePeriodArtifacts, retainPublishedExpensePeriods } from "./expense-release.mjs";
import { buildReleaseSet } from "./release-set.mjs";
import { createR2ManifestClient, readConditionalManifest, putConditionalManifest, changedManifestEntries } from "./etl/r2-conditional-manifest.mjs";

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

if (requestedGroups.includes("gastos")) writeExpensePeriodArtifacts(root);
const files = parseRequestedStaticFiles({ files: requestedFiles, groups: requestedGroups, root });
const releaseId = sha256Buffer(Buffer.from(files.map((file) => {
  const path = resolveSafeStaticPath(root, file);
  if (!existsSync(path)) throw new Error(`STATIC_INPUT_MISSING: ${file}`);
  return `${file}:${sha256Buffer(readFileSync(path))}`;
}).join("\n"), "utf8"));
const generatedEntries = buildStaticInputEntries({ root, files, releaseId });
let freshEntries = generatedEntries;
let manifest = buildStaticInputManifest({ entries: generatedEntries });
let storageBudget = null;

if (!localOnly) {
  const credentials = !allowLocalAuth ? requireCloudflareDataCredentials() : {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    token: process.env.CLOUDFLARE_API_TOKEN,
  };
  mkdirSync(output, { recursive: true });
  const client = await createR2ManifestClient(credentials);
  const manifestUrl = client.url(bucket, manifestKey);
  const { manifest: previous, etag } = await readConditionalManifest({ url: manifestUrl, fetchImpl: client.fetch });
  assertStaticInputManifest(previous);
  buildReleaseSet(previous);
  let candidateEntries = generatedEntries;
  if (requestedGroups.includes("gastos")) {
    const indexPath = "data/lake-subsets/expense-periods/manifest.json";
    const fullPath = resolveSafeStaticPath(root, indexPath);
    const index = retainPublishedExpensePeriods(JSON.parse(readFileSync(fullPath, "utf8")), previous);
    const content = Buffer.from(`${JSON.stringify(index)}\n`);
    writeFileSync(fullPath, content);
    const retainedIndexEntries = buildStaticInputEntries({ root, files: [indexPath], releaseId: sha256Buffer(content) });
    candidateEntries = [...generatedEntries.filter((entry) => entry.path !== indexPath), ...retainedIndexEntries];
  }
  freshEntries = changedManifestEntries(omitRetainedExpenseSubsets(candidateEntries, previous), previous);
  const merged = new Map((previous?.files ?? []).map((file) => [file.path, file]));
  for (const file of freshEntries) merged.set(file.path, file);
  manifest = freshEntries.length ? buildStaticInputManifest({ entries: [...merged.values()] }) : previous;
  const releaseDir = join(output, "releases", releaseId);
  mkdirSync(releaseDir, { recursive: true });
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  writeFileSync(join(output, "manifest.json"), manifestText, "utf8");
  if (freshEntries.length) {
    storageBudget = await assertRemoteR2WriteBudget({
      accountId: credentials.accountId,
      token: credentials.token,
      buckets: configuredR2BudgetBuckets(bucket),
      puts: [
        ...freshEntries.map((entry) => ({ bucket, key: entry.key, size: entry.size })),
        { bucket, key: manifestKey, size: Buffer.byteLength(manifestText) },
      ],
    });
    for (const entry of freshEntries) {
      const source = resolveSafeStaticPath(root, entry.path);
      const content = readFileSync(source);
      assertStaticInputContentQuality(entry.path, content);
      const staged = join(releaseDir, entry.path.replaceAll("/", "__"));
      writeFileSync(staged, content);
      runWrangler(["r2", "object", "put", `${bucket}/${entry.key}`, "--file", staged, "--content-type", "application/json"]);
    }
    await putConditionalManifest({ url: manifestUrl, etag, body: manifestText, fetchImpl: client.fetch });
  }
} else {
  mkdirSync(output, { recursive: true });
  writeFileSync(join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify({
  action: localOnly ? "local-only" : freshEntries.length ? "published" : "unchanged",
  bucket: localOnly ? null : bucket,
  manifestKey: localOnly ? null : manifestKey,
  releaseId,
  files: manifest.files.length,
  updatedFiles: freshEntries.length,
  checksumSha256: manifest.checksumSha256,
  storageBudget: storageBudget ? {
    currentBytes: storageBudget.currentBytes,
    projectedBytes: storageBudget.projectedBytes,
    peakBytes: storageBudget.peakBytes,
  } : null,
}, null, 2));
