#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  copyFileSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createGunzip, createGzip } from "node:zlib";
import { once } from "node:events";
import { finished } from "node:stream/promises";
import { createInterface } from "node:readline";
import { spawnSync } from "node:child_process";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const period = argument("--period", "");
const baseManifestPath = resolve(argument("--base-manifest", ""));
const baseArchivePath = resolve(argument("--base-archive", ""));
const lakeRoot = resolve(argument("--lake-root", "data/lake"));
if (!/^\d{4}-(0[1-9]|1[0-2])$/u.test(period) || !existsSync(baseManifestPath) || !existsSync(baseArchivePath)) {
  throw new Error("USAGE: --period YYYY-MM --base-manifest FILE --base-archive FILE [--lake-root DIR]");
}

const hashBytes = (value) => createHash("sha256").update(value).digest("hex");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const indexPrefix = "indexes/v1/chilecompra/";
const partitionPrefix = `partitions/chilecompra/${period.replace("-", "/")}/`;
const publishPlanPath = join(lakeRoot, "publish-plan.json");
if (!existsSync(publishPlanPath)) throw new Error("CHILECOMPRA_INDEX_PUBLISH_PLAN_MISSING");
const publishPlan = readJson(publishPlanPath);
if (!Array.isArray(publishPlan.assets)) throw new Error("CHILECOMPRA_INDEX_PUBLISH_PLAN_INVALID");

const catalogKey = "catalog/v1/manifest.json";
const catalogPath = join(lakeRoot, ...catalogKey.split("/"));
if (!existsSync(catalogPath)) throw new Error("CHILECOMPRA_INDEX_CATALOG_MISSING");
const catalog = readJson(catalogPath);
const partitionId = `chilecompra/${period.replace("-", "/")}`;
const partition = catalog.partitions?.find((item) => item.id === partitionId && item.sourceId === "chilecompra" && item.period === period);
if (!Number.isSafeInteger(partition?.recordCount) || partition.recordCount < 1) {
  throw new Error(`CHILECOMPRA_INDEX_PARTITION_NOT_VERIFIED:${partitionId}`);
}

const additions = publishPlan.assets
  .filter((asset) => asset.key.startsWith(partitionPrefix) && /records-[^/]+\.jsonl\.gz(?:\.part-\d{4})?$/u.test(asset.key))
  .sort((left, right) => left.key.localeCompare(right.key));
if (additions.length === 0) throw new Error(`CHILECOMPRA_INDEX_PARTITION_ASSETS_MISSING:${partitionId}`);

const baseManifestBytes = readFileSync(baseManifestPath);
const baseManifest = JSON.parse(baseManifestBytes.toString("utf8"));
if (baseManifest.schemaVersion !== 1 || baseManifest.sourceId !== "chilecompra"
  || !Number.isSafeInteger(baseManifest.totalRows) || baseManifest.totalRows < 1
  || !Number.isSafeInteger(baseManifest.pageSize) || baseManifest.pageSize < 1
  || !Array.isArray(baseManifest.pages)
  || baseManifest.pages.length !== Math.ceil(baseManifest.totalRows / baseManifest.pageSize)
  || typeof baseManifest.recordArchiveKey !== "string"
  || !baseManifest.recordArchiveKey.startsWith(indexPrefix)) {
  throw new Error("CHILECOMPRA_INDEX_BASE_MANIFEST_INVALID");
}

function assertLocalAsset(asset) {
  const path = resolve(lakeRoot, ...asset.key.split("/"));
  const pathFromRoot = relative(lakeRoot, path);
  if (!pathFromRoot || pathFromRoot === ".." || pathFromRoot.startsWith(`..${sep}`) || isAbsolute(pathFromRoot)) {
    throw new Error(`CHILECOMPRA_INDEX_UNSAFE_ASSET_PATH:${asset.key}`);
  }
  if (!existsSync(path)) throw new Error(`CHILECOMPRA_INDEX_ASSET_MISSING:${asset.key}`);
  const stat = statSync(path);
  if (!stat.isFile() || !Number.isSafeInteger(asset.size) || stat.size !== asset.size) {
    throw new Error(`CHILECOMPRA_INDEX_ASSET_SIZE_MISMATCH:${asset.key}`);
  }
  return path;
}

async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

const existingIds = new Set();
let baseRows = 0;
let baseOffset = 0;
let activePage = 0;
let activePageBytes = 0;
const baseHash = createHash("sha256");
const compressorInputRoot = join(lakeRoot, ".work");
mkdirSync(compressorInputRoot, { recursive: true });
const temporaryRoot = mkdtempSync(join(compressorInputRoot, "chilecompra-index-refresh-"));
const combinedArchivePath = join(temporaryRoot, "combined-records.jsonl.gz");
const builderOutput = join(temporaryRoot, "built-index");
mkdirSync(builderOutput, { recursive: true });
const combinedOutput = createWriteStream(combinedArchivePath, { flags: "wx" });
const compressor = createGzip({ level: 6 });
compressor.pipe(combinedOutput);
const outputFinished = finished(combinedOutput);
const compressorFinished = finished(compressor);

async function writeLine(line) {
  if (!compressor.write(`${line}\n`)) await once(compressor, "drain");
}

function parseIndexRecord(line, context) {
  let record;
  try {
    record = JSON.parse(line);
  } catch {
    throw new Error(`CHILECOMPRA_INDEX_INVALID_JSON:${context}`);
  }
  if (!record || typeof record.id !== "string" || !record.id || record.sourceId !== "chilecompra") {
    throw new Error(`CHILECOMPRA_INDEX_INVALID_RECORD:${context}`);
  }
  if (record.occurredAt != null && typeof record.occurredAt !== "string") {
    throw new Error(`CHILECOMPRA_INDEX_INVALID_DATE:${record.id}`);
  }
  return record;
}

async function readCompressedRecords(path, context, onRecord) {
  const decompressed = createReadStream(path).pipe(createGunzip());
  const lines = createInterface({ input: decompressed, crlfDelay: Infinity });
  let rows = 0;
  for await (const line of lines) {
    if (!line) continue;
    const record = parseIndexRecord(line, `${context}:${rows + 1}`);
    await onRecord(record, line);
    rows += 1;
  }
  return rows;
}

let additionsRows = 0;
try {
  const baseLines = createInterface({ input: createReadStream(baseArchivePath), crlfDelay: Infinity });
  for await (const line of baseLines) {
    if (!line) continue;
    const record = parseIndexRecord(line, `base:${baseRows + 1}`);
    if (existingIds.has(record.id)) throw new Error(`CHILECOMPRA_INDEX_DUPLICATE_BASE_ID:${record.id}`);
    existingIds.add(record.id);
    const pageIndex = Math.floor(baseRows / baseManifest.pageSize);
    if (pageIndex !== activePage) {
      const page = baseManifest.pages[activePage];
      if (!page || page.offset !== baseOffset || page.length !== activePageBytes) {
        throw new Error(`CHILECOMPRA_INDEX_BASE_PAGE_MISMATCH:${activePage}`);
      }
      baseOffset += activePageBytes;
      activePageBytes = 0;
      activePage = pageIndex;
    }
    const normalizedLine = `${line}\n`;
    const bytes = Buffer.byteLength(normalizedLine, "utf8");
    baseHash.update(normalizedLine);
    activePageBytes += bytes;
    await writeLine(line);
    baseRows += 1;
  }
  if (baseRows !== baseManifest.totalRows) throw new Error(`CHILECOMPRA_INDEX_BASE_ROW_COUNT_MISMATCH:${baseRows}:${baseManifest.totalRows}`);
  const finalBasePage = baseManifest.pages[activePage];
  if (!finalBasePage || finalBasePage.offset !== baseOffset || finalBasePage.length !== activePageBytes
    || activePage !== baseManifest.pages.length - 1) {
    throw new Error(`CHILECOMPRA_INDEX_BASE_PAGE_MISMATCH:${activePage}`);
  }
  if (typeof baseManifest.recordArchiveChecksumSha256 === "string"
    && baseManifest.recordArchiveChecksumSha256 !== baseHash.digest("hex")) {
    throw new Error("CHILECOMPRA_INDEX_BASE_ARCHIVE_CHECKSUM_MISMATCH");
  }
  if (typeof baseManifest.recordArchiveChecksumSha256 !== "string") baseHash.digest("hex");

  for (const asset of additions) {
    const path = assertLocalAsset(asset);
    const checksum = await sha256File(path);
    if (checksum !== asset.checksumSha256) throw new Error(`CHILECOMPRA_INDEX_ASSET_CHECKSUM_MISMATCH:${asset.key}`);
    additionsRows += await readCompressedRecords(path, asset.key, async (record, line) => {
      if (existingIds.has(record.id)) throw new Error(`DUPLICATE_CHILECOMPRA_INDEX_RECORD:${record.id}`);
      existingIds.add(record.id);
      await writeLine(line);
    });
  }
  if (additionsRows !== partition.recordCount) {
    throw new Error(`CHILECOMPRA_INDEX_PARTITION_ROW_COUNT_MISMATCH:${additionsRows}:${partition.recordCount}`);
  }
  compressor.end();
  await Promise.all([outputFinished, compressorFinished]);

  const scriptPath = fileURLToPath(new URL("./build-r2-record-index.mjs", import.meta.url));
  const built = spawnSync(process.execPath, ["--max-old-space-size=4096", scriptPath,
    "--source", "chilecompra", "--input-dir", temporaryRoot, "--output", builderOutput], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
  if (built.error) throw built.error;
  if (built.status !== 0) throw new Error(`CHILECOMPRA_INDEX_BUILDER_FAILED:${built.status}`);

  const builtManifest = readJson(join(builderOutput, "manifest.json"));
  const expectedTotalRows = baseManifest.totalRows + additionsRows;
  if (builtManifest.sourceId !== "chilecompra" || builtManifest.totalRows !== expectedTotalRows) {
    throw new Error(`CHILECOMPRA_INDEX_TOTAL_ROW_COUNT_MISMATCH:${builtManifest.totalRows}:${expectedTotalRows}`);
  }
  if (!Array.isArray(builtManifest.pages) || builtManifest.pages.length !== Math.ceil(expectedTotalRows / builtManifest.pageSize)) {
    throw new Error("CHILECOMPRA_INDEX_GENERATED_PAGE_COUNT_MISMATCH");
  }
  const periodIndexPath = join(builderOutput, builtManifest.periodIndexKey.split("/").at(-1));
  const periodIndexBytes = readFileSync(periodIndexPath);
  const periodIndex = JSON.parse(periodIndexBytes.toString("utf8"));
  if (hashBytes(periodIndexBytes) !== builtManifest.periodIndexChecksumSha256
    || periodIndex.sourceId !== "chilecompra"
    || periodIndex.totalRows !== expectedTotalRows
    || periodIndex.archiveKey !== builtManifest.dateArchiveKey
    || periodIndex.archiveChecksumSha256 !== builtManifest.dateArchiveChecksumSha256) {
    throw new Error("CHILECOMPRA_INDEX_GENERATED_PERIOD_INDEX_INVALID");
  }
  const checksumExpectations = [
    [builtManifest.recordArchiveKey, builtManifest.recordArchiveChecksumSha256],
    [builtManifest.dateArchiveKey, builtManifest.dateArchiveChecksumSha256],
    [builtManifest.searchIndexKey, builtManifest.searchIndexChecksumSha256],
    [builtManifest.searchCountIndexKey, builtManifest.searchCountIndexChecksumSha256],
  ];
  for (const [key, expectedChecksum] of checksumExpectations) {
    if (typeof key !== "string" || typeof expectedChecksum !== "string"
      || await sha256File(join(builderOutput, key.split("/").at(-1))) !== expectedChecksum) {
      throw new Error(`CHILECOMPRA_INDEX_GENERATED_CHECKSUM_MISMATCH:${key}`);
    }
  }
  const rollbackChecksum = hashBytes(baseManifestBytes);
  const rollbackManifestKey = `${indexPrefix}manifest-${rollbackChecksum}.json`;
  const newManifest = {
    ...builtManifest,
    rollbackManifestKey,
    updatedAt: new Date().toISOString(),
  };
  const newManifestText = `${JSON.stringify(newManifest, null, 2)}\n`;
  const backupManifestPath = join(builderOutput, `manifest-${rollbackChecksum}.json`);
  writeFileSync(backupManifestPath, baseManifestBytes, { flag: "wx" });
  writeFileSync(join(builderOutput, "manifest.json"), newManifestText, "utf8");

  const referencedKeys = [
    newManifest.recordArchiveKey,
    newManifest.dateArchiveKey,
    newManifest.periodIndexKey,
    newManifest.searchIndexKey,
    newManifest.searchCountIndexKey,
  ];
  if (referencedKeys.some((key) => typeof key !== "string" || !key.startsWith(indexPrefix))) {
    throw new Error("CHILECOMPRA_INDEX_GENERATED_MANIFEST_INVALID");
  }
  const outputKeys = [...referencedKeys, "indexes/v1/chilecompra/manifest.json", rollbackManifestKey];
  const indexAssets = [];
  for (const key of [...new Set(outputKeys)].sort()) {
    const fileName = key.slice(indexPrefix.length);
    const sourcePath = join(builderOutput, fileName);
    if (!existsSync(sourcePath)) throw new Error(`CHILECOMPRA_INDEX_OUTPUT_MISSING:${key}`);
    const size = statSync(sourcePath).size;
    const checksumSha256 = await sha256File(sourcePath);
    const targetPath = join(lakeRoot, ...key.split("/"));
    mkdirSync(dirname(targetPath), { recursive: true });
    if (existsSync(targetPath) && (statSync(targetPath).size !== size || await sha256File(targetPath) !== checksumSha256)) {
      throw new Error(`CHILECOMPRA_INDEX_IMMUTABLE_ASSET_CONFLICT:${key}`);
    }
    if (!existsSync(targetPath)) copyFileSync(sourcePath, targetPath, 0);
    indexAssets.push({
      key,
      checksumSha256,
      size,
      releaseTag: `data-chilecompra-${period}-index-${checksumSha256.slice(0, 16)}`,
      releaseAssetName: `chilecompra-${period}-${fileName.replaceAll("/", "-")}`,
      r2Only: true,
    });
  }

  const mergedAssets = [
    ...publishPlan.assets.filter((asset) => !asset.key.startsWith(indexPrefix)),
    ...indexAssets,
  ].sort((left, right) => left.key.localeCompare(right.key));
  const nextPlan = { ...publishPlan, assets: mergedAssets };
  const temporaryPlanPath = `${publishPlanPath}.tmp-${process.pid}`;
  writeFileSync(temporaryPlanPath, `${JSON.stringify(nextPlan, null, 2)}\n`, { flag: "wx" });
  renameSync(temporaryPlanPath, publishPlanPath);
  console.log(JSON.stringify({ sourceId: "chilecompra", period, baseRows, additionsRows, totalRows: expectedTotalRows, indexAssets: indexAssets.length, rollbackManifestKey }, null, 2));
} catch (error) {
  compressor.destroy();
  combinedOutput.destroy();
  throw error;
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
