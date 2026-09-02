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

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
const output = args.get("output") ?? "";
if (!source || !input || !output) throw new Error("Usage requires --source, --input and --output");

const pageSize = 50;
const lines = gunzipSync(readFileSync(resolve(input))).toString("utf8").split("\n").filter(Boolean);

const outDir = resolve(output);
mkdirSync(outDir, { recursive: true });
const archivePath = resolve(outDir, "records.jsonl");
let archive = "";
const pages = [];
const search = new Map();
const searchableText = (record) => {
  const data = record.data ?? {};
  const people = [data.buyer, ...(Array.isArray(data.suppliers) ? data.suppliers : []), ...(Array.isArray(data.recipients) ? data.recipients : [])];
  return [
    record.id, record.kind, record.occurredAt, data.title, data.description, data.period,
    data.organismo, data.organismo_nombre, data.institution, data.institution_name,
    data.provider, data.provider_name, data.receptor, data.receptor_name,
    ...people.flatMap((person) => [person?.id, person?.name, person?.legal_name, person?.rut_juridico]),
  ].filter((value) => typeof value === "string" || typeof value === "number").join(" ").toLocaleLowerCase("es-CL");
};
for (let index = 0; index < lines.length; index += 1) {
  if (index % pageSize === 0) {
    const offset = Buffer.byteLength(archive, "utf8");
    pages.push({ offset, length: 0 });
  }
  const pageIndex = Math.floor(index / pageSize);
  const line = `${lines[index]}\n`;
  archive += line;
  pages[pageIndex].length += Buffer.byteLength(line, "utf8");
  const haystack = searchableText(JSON.parse(lines[index]));
  for (const term of new Set(haystack.match(/[\p{L}\p{N}]{3,}/gu) ?? [])) {
    const current = search.get(term) ?? [];
    if (current.length === 0 || current[current.length - 1] !== pageIndex) current.push(pageIndex);
    search.set(term, current);
  }
}

writeFileSync(archivePath, archive, "utf8");
const searchObject = Object.fromEntries([...search.entries()].sort(([left], [right]) => left.localeCompare(right)));
const searchPath = resolve(outDir, "search.json");
writeFileSync(searchPath, JSON.stringify(searchObject), "utf8");
const manifest = {
  schemaVersion: 1,
  sourceId: source,
  totalRows: lines.length,
  pageSize,
  recordArchiveKey: `indexes/v1/${source}/records.jsonl`,
  searchIndexKey: `indexes/v1/${source}/search.json`,
  pages,
};
writeFileSync(resolve(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
console.log(JSON.stringify({ source, totalRows: lines.length, totalPages: pages.length, archiveBytes: Buffer.byteLength(archive), searchTerms: search.size, output: outDir }, null, 2));
