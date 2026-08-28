import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const bucket = process.env.LEY_19862_R2_BUCKET ?? "transparencia-public-data";
const remoteManifestPath = resolve(root, ".ci-transfer-api-manifest.json");
const localManifestPath = resolve(root, "public/data/transferencias/manifest.json");

try {
  const wrangler = resolve(root, "node_modules/wrangler/bin/wrangler.js");
  const result = spawnSync(process.execPath, [
    wrangler,
    "r2",
    "object",
    "get",
    `${bucket}/projections/transferencias-v1/manifest.json`,
    "--file",
    remoteManifestPath,
    "--remote",
  ], { cwd: root, stdio: "inherit" });
  if (result.status !== 0 || !existsSync(remoteManifestPath)) {
    throw new Error("TRANSFER_R2_MANIFEST_MISSING");
  }

  const remote = JSON.parse(readFileSync(remoteManifestPath, "utf8"));
  const local = JSON.parse(readFileSync(localManifestPath, "utf8"));
  const fields = ["totalRows", "totalPages", "checksumSha256"];
  for (const field of fields) {
    if (remote[field] !== local[field]) {
      throw new Error(`TRANSFER_STATIC_API_MISMATCH:${field}:${local[field]}:${remote[field]}`);
    }
  }
  if (local.expected?.totalMontoClp !== remote.expected?.totalMontoClp) {
    throw new Error("TRANSFER_STATIC_API_MISMATCH:totalMontoClp");
  }

  const localContent = readFileSync(localManifestPath);
  console.log(JSON.stringify({
    ok: true,
    totalRows: local.totalRows,
    totalPages: local.totalPages,
    checksumSha256: local.checksumSha256,
    manifestSha256: createHash("sha256").update(localContent).digest("hex"),
  }, null, 2));
} finally {
  rmSync(remoteManifestPath, { force: true });
}
