import { existsSync, mkdtempSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { buildTransferenciasStatic } from "./build-transferencias-static.mjs";

const root = resolve(import.meta.dirname, "..");
const bucket = process.env.LEY19862_R2_BUCKET ?? "transparencia-public-data";
const source = process.env.LEY19862_SOURCE_ROOT
  ? resolve(process.env.LEY19862_SOURCE_ROOT)
  : join(root, "data", "lake", "partitions", "ley-19862");

function wrangler(args) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(command, ["wrangler", ...args, "--remote"], { cwd: root, encoding: "utf8", stdio: "inherit", shell: false });
  if (result.status !== 0) throw new Error(`TRANSFER_API_R2_PUBLISH_FAILED: ${args.join(" ")}`);
}

function put(key, file, contentType = "application/json") {
  wrangler(["r2", "object", "put", `${bucket}/${key}`, "--file", file, "--content-type", contentType]);
}

const staging = mkdtempSync(join(tmpdir(), "cambiometro-transfer-api-"));
try {
  if (!existsSync(source)) throw new Error(`TRANSFER_API_SOURCE_MISSING: ${source}`);
  const release = await buildTransferenciasStatic({ source, output: staging });
  if (!release) throw new Error("TRANSFER_API_RELEASE_EMPTY");
  const { manifest } = release;
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
  for (const page of apiManifest.pages) put(page.key, join(staging, page.path.split("/").pop()));
  put(apiManifest.searchIndex.key, join(staging, "search-index.json"));
  put("projections/transferencias-v1/manifest.json", pointer);
  console.log(JSON.stringify({ bucket, dataset: apiManifest.dataset, totalRows: apiManifest.totalRows, totalPages: apiManifest.totalPages, checksumSha256: apiManifest.checksumSha256, releasePrefix }, null, 2));
} finally {
  await rm(staging, { recursive: true, force: true });
}
