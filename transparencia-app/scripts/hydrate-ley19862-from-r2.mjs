import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const bucket = process.env.LEY_19862_R2_BUCKET ?? "transparencia-public-data";
const lakeRoot = join(root, "data", "lake");
const catalogPath = join(lakeRoot, "catalog", "v1", "manifest.json");

function runWrangler(args) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, ["wrangler", ...args], { cwd: root, stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolvePromise() : reject(new Error(`wrangler terminó con ${code}`)));
  });
}

function checksum(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

async function download(key, destination, expectedChecksum) {
  mkdirSync(dirname(destination), { recursive: true });
  await runWrangler(["r2", "object", "get", `${bucket}/${key}`, "--file", destination, "--remote"]);
  if (expectedChecksum && checksum(destination) !== expectedChecksum) throw new Error(`LEY_19862_R2_CHECKSUM_INVALID: ${key}`);
}

if (!existsSync(catalogPath)) throw new Error(`LEY_19862_CATALOG_MISSING: ${catalogPath}`);
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const all = (catalog.partitions ?? []).filter((partition) => partition.sourceId === "ley-19862");
const years = all.map((partition) => Number(String(partition.id).split("/")[1])).filter(Number.isInteger);
const latestYear = Math.max(...years);
const partitions = all.filter((partition) => String(partition.id).split("/")[1] === String(latestYear));
if (!partitions.length) throw new Error("LEY_19862_R2_PARTITIONS_MISSING");

const sourceRoot = join(lakeRoot, "partitions", "ley-19862");
rmSync(sourceRoot, { recursive: true, force: true });
const queue = [...partitions];
const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
  while (queue.length) {
    const partition = queue.shift();
    if (!partition) return;
    const manifestPath = join(lakeRoot, partition.manifestKey);
    await download(partition.manifestKey, manifestPath);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const artifacts = (manifest.artifacts ?? []).filter((artifact) => artifact.key?.endsWith(".jsonl.gz"));
    if (artifacts.length !== 1) throw new Error(`LEY_19862_R2_ARTIFACT_COUNT_INVALID: ${partition.id}`);
    await download(artifacts[0].key, join(lakeRoot, artifacts[0].key), artifacts[0].checksumSha256);
  }
});
await Promise.all(workers);
const downloaded = readdirSync(sourceRoot, { recursive: true }).filter((name) => String(name).endsWith("manifest.json"));
if (downloaded.length !== partitions.length) throw new Error(`LEY_19862_R2_PARTITION_COUNT_INVALID: ${downloaded.length}/${partitions.length}`);
console.log(JSON.stringify({ bucket, year: latestYear, partitions: partitions.length, recordCount: partitions.reduce((sum, partition) => sum + Number(partition.recordCount ?? 0), 0), generatedAt: catalog.generatedAt }, null, 2));
