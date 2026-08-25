import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { assertMinimumTransferRows } from "./etl/transfer-release-guard.mjs";

const root = resolve(import.meta.dirname, "..");
const transferRoot = join(root, "public", "data", "transferencias");
const staticManifestPath = join(root, "public", "data", "static-site-manifest.json");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const fail = (message) => { throw new Error(`TRANSFER_RELEASE_INVALID: ${message}`); };

const manifest = await readJson(join(transferRoot, "manifest.json"));
if (manifest.schemaVersion !== 1) fail("schemaVersion must be 1");
if (manifest.dataset !== "ley-19862-transferencias") fail(`unexpected dataset ${manifest.dataset}`);
const allowSample = process.env.ALLOW_STATIC_SAMPLE === "1";
if (!Number.isInteger(manifest.totalRows) || (!allowSample && manifest.totalRows <= 1000)) fail(`full dataset required, got ${manifest.totalRows}`);
if (!allowSample) {
  try {
    assertMinimumTransferRows(manifest.totalRows);
  } catch (error) {
    fail(error.message);
  }
}
if (manifest.pageSize !== 50) fail(`pageSize must be 50, got ${manifest.pageSize}`);
if (manifest.totalPages !== Math.ceil(manifest.totalRows / manifest.pageSize)) fail("totalPages does not match totalRows/pageSize");
if (!Array.isArray(manifest.pages) || manifest.pages.length !== manifest.totalPages) fail("pages does not match totalPages");
if (!/^[a-f0-9]{64}$/i.test(manifest.checksumSha256 ?? "")) fail("checksumSha256 is not SHA-256");

const rows = [];
let pageRowCount = 0;
for (const page of manifest.pages) {
  if (!/^\/data\/transferencias\/p-\d{4}\.json$/.test(page.path ?? "")) fail(`invalid page path ${page.path}`);
  const file = join(root, "public", page.path.replace(/^\//, ""));
  const content = await readFile(file, "utf8");
  if (sha256(content) !== page.sha256) fail(`page checksum mismatch ${page.path}`);
  const pageRows = JSON.parse(content);
  if (!Array.isArray(pageRows) || pageRows.length !== page.count) fail(`page count mismatch ${page.path}`);
  rows.push(...pageRows);
  pageRowCount += pageRows.length;
}
if (pageRowCount !== manifest.totalRows || rows.length !== manifest.totalRows) fail(`page rows ${pageRowCount} != manifest ${manifest.totalRows}`);

const releaseChecksum = sha256(rows.map((row) => JSON.stringify(row)).join("\n"));
if (releaseChecksum !== manifest.checksumSha256) fail("release checksum does not match page contents");

const summary = await readJson(join(transferRoot, "summary.json"));
if (summary.kpis?.total_transfers !== manifest.totalRows) fail("summary total_transfers differs from manifest");
if (summary.kpis?.total_monto_clp !== manifest.expected?.totalMontoClp) fail("summary amount differs from manifest");
if (summary.kpis?.total_receptores !== manifest.expected?.totalReceptores) fail("summary receivers differs from manifest");
if (summary.kpis?.total_emisores !== manifest.expected?.totalEmisores) fail("summary emitters differs from manifest");
const years = Object.values(summary.by_year ?? {});
if (years.reduce((sum, item) => sum + Number(item.count ?? 0), 0) !== manifest.totalRows) fail("summary by_year count differs from manifest");
if (years.reduce((sum, item) => sum + Number(item.total ?? 0), 0) !== manifest.expected?.totalMontoClp) fail("summary by_year amount differs from manifest");

const searchIndex = await readJson(join(transferRoot, "search-index.json"));
if (!Array.isArray(searchIndex) || searchIndex.length !== manifest.totalRows) fail("search index count differs from manifest");
if (searchIndex.length !== manifest.searchIndex?.count) fail("search index metadata count differs from file");
if (sha256(`${JSON.stringify(searchIndex)}\n`) !== manifest.searchIndex?.sha256) fail("search index checksum differs from manifest");

const siteManifest = await readJson(staticManifestPath);
const siteTransfer = siteManifest.datasets?.transferencias;
if (siteTransfer?.totalRows !== manifest.totalRows || siteTransfer?.checksumSha256 !== manifest.checksumSha256) fail("static-site-manifest points to another transfer release");

console.log(JSON.stringify({
  dataset: manifest.dataset,
  totalRows: manifest.totalRows,
  totalPages: manifest.totalPages,
  totalMontoClp: manifest.expected.totalMontoClp,
  checksumSha256: manifest.checksumSha256,
  searchIndexRows: searchIndex.length,
}, null, 2));
