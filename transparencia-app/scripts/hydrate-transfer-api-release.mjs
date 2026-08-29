import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const bucket = process.env.LEY19862_R2_BUCKET ?? "transparencia-public-data";
const manifestFile = resolve(argument("--manifest", join(root, ".ci-data-version", "transfer-api-manifest.json")));
const output = resolve(argument("--output", join(root, "public", "data", "transferencias")));
const DOWNLOAD_CONCURRENCY = 8;
const DOWNLOAD_TIMEOUT_MS = 120_000;
const MAX_ATTEMPTS = 3;

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function runWrangler(args) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, ["wrangler", ...args, "--remote"], {
      cwd: root,
      stdio: "ignore",
      shell: false,
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`TRANSFER_API_DOWNLOAD_TIMEOUT:${args.join(" ")}`));
    }, DOWNLOAD_TIMEOUT_MS);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      code === 0 ? resolvePromise() : reject(new Error(`TRANSFER_API_DOWNLOAD_FAILED:${args.join(" ")}`));
    });
  });
}

async function download(key, file, expectedChecksum) {
  mkdirSync(join(file, ".."), { recursive: true });
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await runWrangler(["r2", "object", "get", `${bucket}/${key}`, "--file", file]);
      const content = readFileSync(file);
      if (expectedChecksum && sha256(content) !== expectedChecksum) {
        throw new Error(`TRANSFER_API_DOWNLOAD_CHECKSUM:${key}`);
      }
      return;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_000 * attempt));
    }
  }
  throw lastError;
}

function validateManifest(manifest) {
  if (manifest?.schemaVersion !== 1 || manifest.dataset !== "ley-19862-transferencias") {
    throw new Error("TRANSFER_API_MANIFEST_INVALID");
  }
  if (!Number.isSafeInteger(manifest.totalRows) || !Array.isArray(manifest.pages) || manifest.pages.length !== manifest.totalPages) {
    throw new Error("TRANSFER_API_MANIFEST_COUNTS_INVALID");
  }
  if (!/^[a-f0-9]{64}$/i.test(manifest.checksumSha256 ?? "")) throw new Error("TRANSFER_API_MANIFEST_CHECKSUM_INVALID");
  for (const page of manifest.pages) {
    if (!/^\/data\/transferencias\/p-\d{4}\.json$/.test(page.path ?? "")) throw new Error(`TRANSFER_API_PAGE_PATH_INVALID:${page.path}`);
    if (!/^projections\/transferencias-v1\/releases\/[a-f0-9]{64}\/p-\d{4}\.json$/i.test(page.key ?? "")) {
      throw new Error(`TRANSFER_API_PAGE_KEY_INVALID:${page.key}`);
    }
  }
  if (!/^projections\/transferencias-v1\/releases\/[a-f0-9]{64}\/search-index\.json$/i.test(manifest.searchIndex?.key ?? "")) {
    throw new Error("TRANSFER_API_SEARCH_KEY_INVALID");
  }
}

function buildSummary(manifest, rows) {
  const byYear = {};
  const receivers = new Map();
  const emitters = new Map();
  for (const row of rows) {
    const year = String(row.fecha ?? row.period ?? "").slice(0, 4);
    if (year) {
      byYear[year] ??= { count: 0, total: 0 };
      byYear[year].count += 1;
      byYear[year].total += Number(row.monto_clp ?? 0);
    }
    for (const [map, nameKey, rutKey] of [[receivers, "receiver_name", "receiver_rut"], [emitters, "emitter_name", "emitter_rut"]]) {
      const name = row[nameKey];
      if (!name) continue;
      const key = `${row[rutKey] ?? ""}\u0000${name}`;
      const item = map.get(key) ?? { name, rut: row[rutKey] ?? "", total_clp: 0, count: 0 };
      item.total_clp += Number(row.monto_clp ?? 0);
      item.count += 1;
      map.set(key, item);
    }
  }
  const rank = (left, right) => right.total_clp - left.total_clp || left.name.localeCompare(right.name, "es");
  return {
    generatedAt: manifest.generatedAt,
    registeredThrough: manifest.registeredThrough ?? null,
    sourceRows: manifest.sourceRows ?? null,
    excludedAfterCutoff: manifest.excludedAfterCutoff ?? 0,
    kpis: {
      total_monto_clp: manifest.expected.totalMontoClp,
      total_transfers: manifest.totalRows,
      total_receptores: manifest.expected.totalReceptores,
      total_emisores: manifest.expected.totalEmisores,
    },
    by_year: Object.fromEntries(Object.entries(byYear).sort(([left], [right]) => left.localeCompare(right))),
    top_receptores: [...receivers.values()].sort(rank).slice(0, 10),
    top_emisores: [...emitters.values()].sort(rank).slice(0, 10),
    transfers_sample: [...rows].sort((left, right) => String(left.fecha ?? "").localeCompare(String(right.fecha ?? "")) || String(left.id).localeCompare(String(right.id))).slice(0, 1000),
  };
}

if (!existsSync(manifestFile)) throw new Error(`TRANSFER_API_MANIFEST_MISSING:${manifestFile}`);
const remoteManifest = JSON.parse(readFileSync(manifestFile, "utf8"));
validateManifest(remoteManifest);
mkdirSync(output, { recursive: true });
for (const file of readdirSync(output)) if (/^p-\d{4}\.json$/.test(file) || ["manifest.json", "search-index.json", "summary.json"].includes(file)) rmSync(join(output, file), { force: true });

const queue = remoteManifest.pages.map((page) => ({
  ...page,
  destination: join(output, page.path.split("/").at(-1)),
}));
const workers = Array.from({ length: Math.min(DOWNLOAD_CONCURRENCY, queue.length) }, async () => {
  while (queue.length) {
    const page = queue.shift();
    if (page) await download(page.key, page.destination, page.sha256);
  }
});
await Promise.all(workers);
const searchDestination = join(output, "search-index.json");
await download(remoteManifest.searchIndex.key, searchDestination, remoteManifest.searchIndex.sha256);

const rows = [];
for (const page of remoteManifest.pages) rows.push(...JSON.parse(readFileSync(join(output, page.path.split("/").at(-1)), "utf8")));
if (rows.length !== remoteManifest.totalRows) throw new Error(`TRANSFER_API_ROWS_INVALID:${rows.length}:${remoteManifest.totalRows}`);
if (sha256(rows.map((row) => JSON.stringify(row)).join("\n")) !== remoteManifest.checksumSha256) throw new Error("TRANSFER_API_RELEASE_CHECKSUM_INVALID");

const localManifest = {
  ...remoteManifest,
  pages: remoteManifest.pages.map(({ key, ...page }) => page),
  searchIndex: { path: "/data/transferencias/search-index.json", count: remoteManifest.searchIndex.count, sha256: remoteManifest.searchIndex.sha256 },
};
writeFileSync(join(output, "manifest.json"), `${JSON.stringify(localManifest, null, 2)}\n`);
writeFileSync(join(output, "summary.json"), `${JSON.stringify(buildSummary(remoteManifest, rows), null, 2)}\n`);
console.log(JSON.stringify({ totalRows: remoteManifest.totalRows, totalPages: remoteManifest.totalPages, checksumSha256: remoteManifest.checksumSha256 }, null, 2));
