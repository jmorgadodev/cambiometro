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

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

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
const archivePath = resolve(outDir, "records.jsonl");
let archive = "";
const pages = [];
const search = new Map();
const searchCounts = new Map();
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

writeFileSync(archivePath, archive, "utf8");
const searchObject = Object.fromEntries([...search.entries()].sort(([left], [right]) => left.localeCompare(right)));
const searchPath = resolve(outDir, "search.json");
writeFileSync(searchPath, JSON.stringify(searchObject), "utf8");
const searchCountsPath = resolve(outDir, "search-counts.json");
writeFileSync(searchCountsPath, JSON.stringify(Object.fromEntries([...searchCounts.entries()].sort(([left], [right]) => left.localeCompare(right)))), "utf8");
const manifest = {
  schemaVersion: 1,
  sourceId: source,
  totalRows: lines.length,
  pageSize,
  recordArchiveKey: `indexes/v1/${source}/records.jsonl`,
  searchIndexKey: `indexes/v1/${source}/search.json`,
  searchCountIndexKey: `indexes/v1/${source}/search-counts.json`,
  pages,
};
writeFileSync(resolve(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
console.log(JSON.stringify({ source, totalRows: lines.length, totalPages: pages.length, archiveBytes: Buffer.byteLength(archive), searchTerms: search.size, output: outDir }, null, 2));
