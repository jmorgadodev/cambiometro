import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { buildTransferStatic } from "./build-transferencias-static.mjs";

const root = resolve(import.meta.dirname, "..");
const bucket = process.env.LEY19862_R2_BUCKET ?? "transparencia-public-data";
const sourceRoot = process.env.LEY19862_SOURCE_ROOT
  ? resolve(process.env.LEY19862_SOURCE_ROOT)
  : join(root, "data", "lake", "partitions", "ley-19862");

function wrangler(args) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(command, ["wrangler", ...args, "--remote"], {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) throw new Error(`WRANGLER_R2_PUBLISH_FAILED: ${args.join(" ")}`);
}

function put(key, file, contentType = "application/json") {
  wrangler(["r2", "object", "put", `${bucket}/${key}`, "--file", file, "--content-type", contentType]);
}

async function main() {
  if (!existsSync(sourceRoot)) throw new Error(`TRANSFER_API_SOURCE_MISSING: ${sourceRoot}`);
  const staging = mkdtempSync(join(tmpdir(), "cambiometro-transfer-api-"));
  try {
    const release = await buildTransferStatic({ sourceRoot, outputRoot: staging });
    const releasePrefix = `projections/transferencias-v1/releases/${release.checksumSha256}`;
    const manifest = JSON.parse(readFileSync(join(staging, "manifest.json"), "utf8"));
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
      pages: manifest.pages.map((page) => ({
        page: page.page,
        count: page.count,
        key: `${releasePrefix}/${page.path.split("/").pop()}`,
        sha256: page.sha256,
      })),
      searchIndex: {
        key: `${releasePrefix}/search-index.json`,
        count: manifest.searchIndex.count,
        sha256: manifest.searchIndex.sha256,
      },
    };
    const apiManifestPath = join(staging, "api-manifest.json");
    await mkdir(staging, { recursive: true });
    await writeFile(apiManifestPath, `${JSON.stringify(apiManifest, null, 2)}\n`, "utf8");

    // Se publican primero los objetos inmutables y el manifest puntero al final.
    for (const page of apiManifest.pages) put(page.key, join(staging, page.key.split("/").pop()));
    put(apiManifest.searchIndex.key, join(staging, "search-index.json"));
    put("projections/transferencias-v1/manifest.json", apiManifestPath);
    console.log(JSON.stringify({ bucket, dataset: apiManifest.dataset, totalRows: apiManifest.totalRows, totalPages: apiManifest.totalPages, checksumSha256: apiManifest.checksumSha256, releasePrefix }, null, 2));
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
