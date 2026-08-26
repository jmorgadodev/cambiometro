import { existsSync, mkdtempSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { buildTransferenciasStatic } from "./build-transferencias-static.mjs";
import { assertMinimumTransferRows } from "./etl/transfer-release-guard.mjs";

const root = resolve(import.meta.dirname, "..");
const bucket = process.env.LEY19862_R2_BUCKET ?? "transparencia-public-data";
const source = process.env.LEY19862_SOURCE_ROOT
  ? resolve(process.env.LEY19862_SOURCE_ROOT)
  : join(root, "data", "lake", "partitions", "ley-19862");
const registeredThrough = process.env.TRANSFER_RELEASE_REGISTERED_THROUGH
  ?? process.env.LEY_19862_REGISTERED_THROUGH
  ?? null;

const UPLOAD_CONCURRENCY = 8;
const UPLOAD_TIMEOUT_MS = 120_000;
const UPLOAD_MAX_ATTEMPTS = 3;
const UPLOAD_RETRY_DELAY_MS = 1_500;

function wrangler(args) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  return new Promise((resolve, reject) => {
    const child = spawn(command, ["wrangler", ...args, "--remote"], { cwd: root, stdio: "inherit", shell: false });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`TRANSFER_API_R2_PUBLISH_TIMEOUT: ${args.join(" ")}`));
    }, UPLOAD_TIMEOUT_MS);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`TRANSFER_API_R2_PUBLISH_FAILED: ${args.join(" ")}`));
    });
  });
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function put(key, file, contentType = "application/json") {
  let lastError;
  for (let attempt = 1; attempt <= UPLOAD_MAX_ATTEMPTS; attempt += 1) {
    try {
      await wrangler(["r2", "object", "put", `${bucket}/${key}`, "--file", file, "--content-type", contentType]);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < UPLOAD_MAX_ATTEMPTS) await wait(UPLOAD_RETRY_DELAY_MS * attempt);
    }
  }
  throw lastError;
}

async function putInBatches(entries) {
  for (let index = 0; index < entries.length; index += UPLOAD_CONCURRENCY) {
    const results = await Promise.allSettled(entries.slice(index, index + UPLOAD_CONCURRENCY)
      .map(({ key, file, contentType }) => put(key, file, contentType)));
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
  }
}

const staging = mkdtempSync(join(tmpdir(), "cambiometro-transfer-api-"));
try {
  if (!existsSync(source)) throw new Error(`TRANSFER_API_SOURCE_MISSING: ${source}`);
  const release = await buildTransferenciasStatic({ source, output: staging, registeredThrough });
  if (!release) throw new Error("TRANSFER_API_RELEASE_EMPTY");
  const { manifest } = release;
  assertMinimumTransferRows(manifest.totalRows);
  const releasePrefix = `projections/transferencias-v1/releases/${manifest.checksumSha256}`;
  const apiManifest = {
    schemaVersion: 1,
    dataset: manifest.dataset,
    generatedAt: manifest.generatedAt,
    totalRows: manifest.totalRows,
    pageSize: manifest.pageSize,
    totalPages: manifest.totalPages,
    checksumSha256: manifest.checksumSha256,
    expected: manifest.expected,
    releasePrefix,
    pages: manifest.pages.map((page) => ({ ...page, key: `${releasePrefix}/${page.path.split("/").pop()}` })),
    searchIndex: { ...manifest.searchIndex, key: `${releasePrefix}/search-index.json` },
  };
  const pointer = join(staging, "api-manifest.json");
  await mkdir(staging, { recursive: true });
  await writeFile(pointer, `${JSON.stringify(apiManifest, null, 2)}\n`, "utf8");
  await putInBatches(apiManifest.pages.map((page) => ({ key: page.key, file: join(staging, page.path.split("/").pop()) })));
  await put(apiManifest.searchIndex.key, join(staging, "search-index.json"));
  await put("projections/transferencias-v1/manifest.json", pointer);
  console.log(JSON.stringify({ bucket, dataset: apiManifest.dataset, totalRows: apiManifest.totalRows, totalPages: apiManifest.totalPages, checksumSha256: apiManifest.checksumSha256, releasePrefix }, null, 2));
} finally {
  await rm(staging, { recursive: true, force: true });
}
