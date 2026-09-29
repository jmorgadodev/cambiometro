#!/usr/bin/env node

/**
 * Builds the low-cost R2 read path for a large source archive.
 *
 * The Worker must not inflate a 150+ MB JSONL archive in memory. This script
 * creates one uncompressed, range-readable JSONL object plus a compact page
 * and token index. The source archive remains the canonical data artifact.
 *
 * Usage:
 *   node scripts/build-r2-record-index.mjs --source chilecompra \
 *     --input .tmp-r2-chilecompra-archive.gz \
 *     --output .tmp-r2-chilecompra-index
 */

import { createWriteStream, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { finished } from "node:stream/promises";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  if (!process.argv[index].startsWith("--")) continue;
  args.set(process.argv[index].slice(2), process.argv[index + 1] ?? "");
  index += 1;
}

const source = args.get("source") ?? "";
const input = args.get("input") ?? "";
const inputDir = args.get("input-dir") ?? "";
const output = args.get("output") ?? "";
if (!source || (!input && !inputDir) || (input && inputDir) || !output) throw new Error("Usage requires --source, --input or --input-dir and --output");

const pageSize = 50;
const inputPaths = input
  ? [resolve(input)]
  : readdirSync(resolve(inputDir), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".jsonl.gz"))
    .map((entry) => resolve(entry.parentPath ?? inputDir, entry.name))
    .sort();
if (inputPaths.length === 0) throw new Error("No .jsonl.gz inputs found");
const lines = inputPaths.flatMap((path) => gunzipSync(readFileSync(path)).toString("utf8").split("\n").filter(Boolean));
const records = lines.map((line) => JSON.parse(line));
if (inputDir) {
  records.sort((left, right) => String(right.occurredAt ?? "").localeCompare(String(left.occurredAt ?? "")) || String(left.id).localeCompare(String(right.id)));
}

const outDir = resolve(output);
mkdirSync(outDir, { recursive: true });
let archive = "";
const pages = [];
const search = new Map();
const searchCounts = new Map();
const dateRecords = [...records].sort((left, right) => String(right.occurredAt ?? "").localeCompare(String(left.occurredAt ?? "")) || String(left.id).localeCompare(String(right.id)));
const dateArchivePages = [];
const temporaryDateArchivePath = resolve(outDir, "records-by-date.jsonl.tmp");
const dateArchiveStream = createWriteStream(temporaryDateArchivePath);
const dateArchiveHash = createHash("sha256");
let dateArchiveBytes = 0;
const monthPages = new Map();
const dayPages = new Map();
let undatedRows = 0;
const searchableText = (record) => {
  const values = [record.id, record.kind, record.occurredAt];
  const collect = (value, depth = 0) => {
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value);
      // Avoid indexing long URLs and opaque payloads while retaining names,
      // institutions, identifiers, subjects and short descriptions.
      if (text.length <= 240 && !/^https?:\/\//i.test(text)) values.push(text);
      return;
    }
    if (depth >= 5 || value === null || typeof value !== "object") return;
    for (const child of Object.values(value)) collect(child, depth + 1);
  };
  collect(record.data);
  return values.join(" ").toLocaleLowerCase("es-CL");
};
for (let index = 0; index < records.length; index += 1) {
  if (index % pageSize === 0) {
    const offset = Buffer.byteLength(archive, "utf8");
    pages.push({ offset, length: 0 });
  }
  const pageIndex = Math.floor(index / pageSize);
  const line = `${JSON.stringify(records[index])}\n`;
  archive += line;
  pages[pageIndex].length += Buffer.byteLength(line, "utf8");
  const haystack = searchableText(records[index]);
  for (const term of new Set(haystack.match(/[\p{L}\p{N}]{3,}/gu) ?? [])) {
    const current = search.get(term) ?? [];
    if (current.length === 0 || current[current.length - 1] !== pageIndex) current.push(pageIndex);
    search.set(term, current);
    searchCounts.set(term, (searchCounts.get(term) ?? 0) + 1);
  }
}

const addDatePage = (map, key, pageIndex) => {
  const entry = map.get(key) ?? { recordCount: 0, pages: [] };
  entry.recordCount += 1;
  if (entry.pages.at(-1) !== pageIndex) entry.pages.push(pageIndex);
  map.set(key, entry);
};
for (let index = 0; index < dateRecords.length; index += 1) {
  const record = dateRecords[index];
  if (index % pageSize === 0) dateArchivePages.push({ offset: dateArchiveBytes, length: 0 });
  const pageIndex = Math.floor(index / pageSize);
  const line = `${JSON.stringify(record)}\n`;
  const lineBytes = Buffer.byteLength(line, "utf8");
  dateArchiveHash.update(line);
  dateArchiveBytes += lineBytes;
  dateArchivePages[pageIndex].length += lineBytes;
  if (!dateArchiveStream.write(line)) await once(dateArchiveStream, "drain");
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

dateArchiveStream.end();
await finished(dateArchiveStream);
const searchObject = Object.fromEntries([...search.entries()].sort(([left], [right]) => left.localeCompare(right)));
const archiveChecksumSha256 = createHash("sha256").update(archive).digest("hex");
const archiveKey = `indexes/v1/${source}/records-${archiveChecksumSha256}.jsonl`;
const archivePath = resolve(outDir, archiveKey.split("/").at(-1));
writeFileSync(archivePath, archive, "utf8");
const searchText = JSON.stringify(searchObject);
const searchChecksumSha256 = createHash("sha256").update(searchText).digest("hex");
const searchKey = `indexes/v1/${source}/search-${searchChecksumSha256}.json`;
writeFileSync(resolve(outDir, searchKey.split("/").at(-1)), searchText, "utf8");
const searchCountsText = JSON.stringify(Object.fromEntries([...searchCounts.entries()].sort(([left], [right]) => left.localeCompare(right))));
const searchCountsChecksumSha256 = createHash("sha256").update(searchCountsText).digest("hex");
const searchCountsKey = `indexes/v1/${source}/search-counts-${searchCountsChecksumSha256}.json`;
writeFileSync(resolve(outDir, searchCountsKey.split("/").at(-1)), searchCountsText, "utf8");
const dateArchiveChecksumSha256 = dateArchiveHash.digest("hex");
const dateArchiveKey = `indexes/v1/${source}/records-by-date-${dateArchiveChecksumSha256}.jsonl`;
renameSync(temporaryDateArchivePath, resolve(outDir, `records-by-date-${dateArchiveChecksumSha256}.jsonl`));
const periodIndexText = JSON.stringify({
  schemaVersion: 1,
  sourceId: source,
  totalRows: records.length,
  undatedRows,
  pageSize,
  archiveKey: dateArchiveKey,
  archiveChecksumSha256: dateArchiveChecksumSha256,
  pages: dateArchivePages,
  months: Object.fromEntries([...monthPages.entries()].sort(([left], [right]) => left.localeCompare(right))),
  days: Object.fromEntries([...dayPages.entries()].sort(([left], [right]) => left.localeCompare(right))),
});
const periodIndexChecksumSha256 = createHash("sha256").update(periodIndexText).digest("hex");
writeFileSync(resolve(outDir, `periods-${periodIndexChecksumSha256}.json`), periodIndexText, "utf8");
const manifest = {
  schemaVersion: 1,
  sourceId: source,
  totalRows: lines.length,
  pageSize,
  recordArchiveKey: archiveKey,
  recordArchiveChecksumSha256: archiveChecksumSha256,
  dateArchiveKey,
  dateArchiveChecksumSha256,
  periodIndexKey: `indexes/v1/${source}/periods-${periodIndexChecksumSha256}.json`,
  periodIndexChecksumSha256,
  searchIndexKey: searchKey,
  searchIndexChecksumSha256: searchChecksumSha256,
  searchCountIndexKey: searchCountsKey,
  searchCountIndexChecksumSha256: searchCountsChecksumSha256,
  pages,
};
writeFileSync(resolve(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
console.log(JSON.stringify({ source, totalRows: lines.length, totalPages: pages.length, archiveBytes: Buffer.byteLength(archive), dateArchiveBytes, datePages: dateArchivePages.length, periods: monthPages.size, searchTerms: search.size, output: outDir }, null, 2));
