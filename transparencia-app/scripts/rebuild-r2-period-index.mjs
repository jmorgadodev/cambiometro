#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { once } from "node:events";
import { finished } from "node:stream/promises";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const source = argument("--source") ?? "";
const archivePath = argument("--archive");
const manifestPath = argument("--manifest");
const outputPath = argument("--output");
if (!source || !archivePath || !manifestPath || !outputPath) {
  throw new Error("Usage: --source SOURCE --archive records.jsonl --manifest manifest.json --output DIRECTORY");
}

const manifest = JSON.parse(readFileSync(resolve(manifestPath), "utf8"));
if (manifest.schemaVersion !== 1 || manifest.sourceId !== source
  || !Number.isSafeInteger(manifest.totalRows) || manifest.totalRows < 1
  || !Number.isSafeInteger(manifest.pageSize) || manifest.pageSize < 1
  || !Array.isArray(manifest.pages)
  || manifest.pages.length !== Math.ceil(manifest.totalRows / manifest.pageSize)) {
  throw new Error("R2_RECORD_INDEX_MANIFEST_INVALID");
}

const records = [];
let rowIndex = 0;
let byteOffset = 0;
let pageBytes = 0;
let activePage = 0;
const verifyPage = (pageIndex) => {
  const page = manifest.pages[pageIndex];
  if (!page || page.offset !== byteOffset || page.length !== pageBytes) throw new Error(`R2_RECORD_INDEX_PAGE_MISMATCH:${pageIndex}`);
  byteOffset += pageBytes;
  pageBytes = 0;
};

const input = createInterface({ input: createReadStream(resolve(archivePath)), crlfDelay: Infinity });
for await (const line of input) {
  if (!line) continue;
  const record = JSON.parse(line);
  const pageIndex = Math.floor(rowIndex / manifest.pageSize);
  if (pageIndex !== activePage) {
    verifyPage(activePage);
    activePage = pageIndex;
  }
  records.push(record);
  pageBytes += Buffer.byteLength(`${line}\n`, "utf8");
  rowIndex += 1;
}
if (rowIndex !== manifest.totalRows) throw new Error(`R2_RECORD_INDEX_ROW_COUNT_MISMATCH:${rowIndex}:${manifest.totalRows}`);
verifyPage(activePage);
if (activePage !== manifest.pages.length - 1 || byteOffset !== manifest.pages.reduce((sum, page) => sum + page.length, 0)) {
  throw new Error("R2_RECORD_INDEX_PAGE_TOTAL_MISMATCH");
}

records.sort((left, right) => String(right.occurredAt ?? "").localeCompare(String(left.occurredAt ?? "")) || String(left.id).localeCompare(String(right.id)));
const datePageSize = manifest.pageSize;
const dateArchivePages = [];
const monthPages = new Map();
const dayPages = new Map();
mkdirSync(resolve(outputPath), { recursive: true });
const temporaryArchivePath = resolve(outputPath, "records-by-date.jsonl.tmp");
const archiveStream = createWriteStream(temporaryArchivePath);
const archiveHash = createHash("sha256");
let dateArchiveBytes = 0;
let undatedRows = 0;
const addDatePage = (map, key, pageIndex) => {
  const entry = map.get(key) ?? { recordCount: 0, pages: [] };
  entry.recordCount += 1;
  if (entry.pages.at(-1) !== pageIndex) entry.pages.push(pageIndex);
  map.set(key, entry);
};

for (let index = 0; index < records.length; index += 1) {
  if (index % datePageSize === 0) dateArchivePages.push({ offset: dateArchiveBytes, length: 0 });
  const record = records[index];
  const pageIndex = Math.floor(index / datePageSize);
  const line = `${JSON.stringify(record)}\n`;
  const lineBytes = Buffer.byteLength(line, "utf8");
  archiveHash.update(line);
  dateArchiveBytes += lineBytes;
  dateArchivePages[pageIndex].length += lineBytes;
  if (!archiveStream.write(line)) await once(archiveStream, "drain");
  const occurredAt = typeof record.occurredAt === "string" ? record.occurredAt : "";
  const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(?:T|$)/.exec(occurredAt);
  const day = match?.[0].slice(0, 10);
  const parsedDate = day ? new Date(`${day}T00:00:00Z`) : null;
  if (day && parsedDate && Number.isFinite(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === day) {
    addDatePage(monthPages, day.slice(0, 7), pageIndex);
    addDatePage(dayPages, day, pageIndex);
  } else {
    undatedRows += 1;
  }
}

archiveStream.end();
await finished(archiveStream);
const dateArchiveChecksumSha256 = archiveHash.digest("hex");
const dateArchiveKey = `indexes/v1/${source}/records-by-date-${dateArchiveChecksumSha256}.jsonl`;
const periodIndexText = JSON.stringify({
  schemaVersion: 1,
  sourceId: source,
  totalRows: records.length,
  undatedRows,
  pageSize: datePageSize,
  archiveKey: dateArchiveKey,
  archiveChecksumSha256: dateArchiveChecksumSha256,
  pages: dateArchivePages,
  months: Object.fromEntries([...monthPages.entries()].sort(([left], [right]) => left.localeCompare(right))),
  days: Object.fromEntries([...dayPages.entries()].sort(([left], [right]) => left.localeCompare(right))),
});
const periodIndexChecksumSha256 = createHash("sha256").update(periodIndexText).digest("hex");
const periodIndexKey = `indexes/v1/${source}/periods-${periodIndexChecksumSha256}.json`;
const updatedManifest = { ...manifest, dateArchiveKey, dateArchiveChecksumSha256, periodIndexKey, periodIndexChecksumSha256 };
const manifestText = `${JSON.stringify(updatedManifest, null, 2)}\n`;

renameSync(temporaryArchivePath, resolve(outputPath, `records-by-date-${dateArchiveChecksumSha256}.jsonl`));
writeFileSync(resolve(outputPath, `periods-${periodIndexChecksumSha256}.json`), periodIndexText, "utf8");
writeFileSync(resolve(outputPath, "manifest.json"), manifestText, "utf8");
console.log(JSON.stringify({
  source,
  totalRows: rowIndex,
  originalArchiveBytes: byteOffset,
  dateArchiveBytes,
  dateArchiveKey,
  monthCount: monthPages.size,
  dayCount: dayPages.size,
  undatedRows,
  periodIndexKey,
  periodIndexBytes: Buffer.byteLength(periodIndexText),
  periodIndexChecksumSha256,
  manifestBytes: Buffer.byteLength(manifestText),
}, null, 2));
