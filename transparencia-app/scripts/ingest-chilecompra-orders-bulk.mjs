#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import csv from "csv-parser";
import iconv from "iconv-lite";

import { gzipDeterministicJsonl, stableStringify } from "./etl/core.mjs";
import {
  canonicalRecordsForOfficialOrder,
  hasExactOfficialOrderSchema,
  mergeOfficialOrderRow,
} from "./etl/chilecompra-orders-bulk.mjs";

const SECTORS = [
  "FuerzasArmadas",
  "Municipalidades",
  "Salud",
  "ObrasPublicas",
  "GobCentralUniversidades",
  "LegislativoJudicial",
  "Otros",
];

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function sha256File(path) {
  return new Promise((resolvePromise, reject) => {
    const hash = createHash("sha256");
    const input = createReadStream(path);
    input.on("data", (chunk) => hash.update(chunk));
    input.on("error", reject);
    input.on("end", () => resolvePromise(hash.digest("hex")));
  });
}

async function download(url, target) {
  if (existsSync(target)) return;
  const response = await fetch(url, {
    headers: { "User-Agent": "TransparenciaChile-ETL/3.0" },
    signal: AbortSignal.timeout(15 * 60_000),
  });
  if (!response.ok || !response.body) throw new Error(`CHILECOMPRA_BULK_HTTP_${response.status}:${url}`);
  const temporary = `${target}.${process.pid}.tmp`;
  await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary));
  const { renameSync } = await import("node:fs");
  renameSync(temporary, target);
}

function archiveCsvFiles(archivePath) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("tar", ["-tf", archivePath], { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let error = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { error += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolvePromise(output.split(/\r?\n/u).map((value) => value.trim()).filter((value) => value.toLowerCase().endsWith(".csv")))
      : reject(new Error(`CHILECOMPRA_BULK_LIST_FAILED:${error.trim()}`)));
  });
}

async function ingestArchiveCsv(archivePath, internalPath, orders, options) {
  const child = spawn("tar", ["-xOf", archivePath, internalPath], { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const parser = child.stdout.pipe(iconv.decodeStream("windows-1252")).pipe(csv({ separator: ";", strict: false }));
  let rows = 0;
  let rejected = 0;
  let headers = [];
  parser.on("headers", (value) => { headers = value; });
  for await (const row of parser) {
    rows += 1;
    if (!hasExactOfficialOrderSchema(row, headers)) {
      rejected += 1;
      continue;
    }
    mergeOfficialOrderRow(orders, row, options);
  }
  const exitCode = await new Promise((resolvePromise, reject) => {
    child.on("error", reject);
    child.on("close", resolvePromise);
  });
  if (exitCode !== 0) throw new Error(`CHILECOMPRA_BULK_EXTRACT_FAILED:${stderr.trim()}`);
  return { rows, rejected };
}

async function writePartition(root, year, month, orders, originals, generatedAt) {
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const records = orders.flatMap(canonicalRecordsForOfficialOrder);
  const projection = await gzipDeterministicJsonl(records, (left, right) => left.id.localeCompare(right.id));
  const directory = resolve(root, "partitions", "chilecompra", String(year), String(month).padStart(2, "0"));
  if (!directory.startsWith(`${root}${sep}`)) throw new Error("CHILECOMPRA_BULK_INVALID_OUTPUT");
  mkdirSync(directory, { recursive: true });
  const fileName = `records-${projection.checksumSha256}.jsonl.gz`;
  writeFileSync(join(directory, fileName), projection.compressed);
  const manifest = {
    artifacts: [{
      checksumSha256: projection.checksumSha256,
      key: `partitions/chilecompra/${year}/${String(month).padStart(2, "0")}/${fileName}`,
      releaseAssetName: `chilecompra-${period}-records.jsonl.gz`,
      size: projection.compressed.byteLength,
    }],
    generatedAt,
    id: `chilecompra/${period}`,
    month,
    original: { archived: false, artifacts: originals },
    projectionChecksumSha256: projection.checksumSha256,
    projectionUncompressedChecksumSha256: projection.uncompressedChecksumSha256,
    recordCount: records.length,
    schemaVersion: "1.0.0",
    sourceId: "chilecompra",
    sourcePeriod: period,
    status: "partial",
    year,
  };
  writeFileSync(join(directory, "manifest.json"), `${stableStringify(manifest)}\n`, "utf8");
  writeFileSync(join(directory, "sha256.txt"), `${projection.checksumSha256}  ${fileName}\n`, "utf8");
  return manifest;
}

function updateCatalog(root, manifests, generatedAt) {
  const path = join(root, "catalog", "v1", "manifest.json");
  if (!existsSync(path)) return;
  const catalog = JSON.parse(readFileSync(path, "utf8"));
  const replacements = new Map(manifests.map((manifest) => [manifest.id, {
    checksumSha256: manifest.projectionChecksumSha256,
    id: manifest.id,
    manifestKey: `partitions/chilecompra/${manifest.year}/${String(manifest.month).padStart(2, "0")}/manifest.json`,
    period: manifest.sourcePeriod,
    recordCount: manifest.recordCount,
    releaseTag: `data-chilecompra-${manifest.year}-${manifest.projectionChecksumSha256.slice(0, 16)}`,
    sourceId: "chilecompra",
    sourcePeriod: manifest.sourcePeriod,
    status: manifest.status,
  }]));
  catalog.partitions = catalog.partitions.map((partition) => replacements.get(partition.id) ?? partition);
  for (const replacement of replacements.values()) {
    if (!catalog.partitions.some((partition) => partition.id === replacement.id)) catalog.partitions.push(replacement);
  }
  catalog.partitions.sort((left, right) => left.id.localeCompare(right.id));
  const chilePartitions = catalog.partitions.filter((partition) => partition.sourceId === "chilecompra");
  const source = catalog.sources.find((item) => item.id === "chilecompra");
  if (source) {
    source.recordCount = chilePartitions.reduce((sum, partition) => sum + partition.recordCount, 0);
    source.foundPeriods = chilePartitions.map((partition) => partition.period).sort();
    source.status = "partial";
  }
  catalog.generatedAt = generatedAt;
  writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
}

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const year = Number(argument("--year") ?? new Date().getUTCFullYear());
const semester = argument("--semester") ?? "Sem1";
const months = new Set(String(argument("--months") ?? (semester === "Sem1" ? "1,2,3,4,5,6" : "7,8,9,10,11,12"))
  .split(",").map(Number).filter((value) => Number.isInteger(value) && value >= 1 && value <= 12));
const cutoff = argument("--cutoff") ?? `${year}-12-31`;
const outputRoot = resolve(argument("--output") ?? join(appRoot, "data", "lake"));
const workRoot = resolve(argument("--work") ?? join(outputRoot, ".work", `chilecompra-orders-${year}-${semester}`));
if (!Number.isInteger(year) || !["Sem1", "Sem2"].includes(semester) || months.size === 0) throw new Error("CHILECOMPRA_BULK_INVALID_ARGUMENTS");
mkdirSync(workRoot, { recursive: true });

const orders = new Map();
const originals = [];
for (const sector of SECTORS) {
  const url = `https://chc-oc-files.mercadopublico.cl/sector/${year}/${semester}/${sector}.7z`;
  const archivePath = join(workRoot, `${sector}.7z`);
  process.stderr.write(`${JSON.stringify({ phase: "download", sector, url })}\n`);
  await download(url, archivePath);
  const checksumSha256 = await sha256File(archivePath);
  const size = statSync(archivePath).size;
  originals.push({ archived: false, checksumSha256, license: "Datos Abiertos ChileCompra", name: basename(archivePath), size, sourceUrl: url });
  for (const internalPath of await archiveCsvFiles(archivePath)) {
    const before = orders.size;
    const { rows, rejected } = await ingestArchiveCsv(archivePath, internalPath, orders, { sourceUrl: `${url}#${internalPath}`, year, months, cutoff });
    process.stderr.write(`${JSON.stringify({ phase: "parse", sector, file: internalPath, rows, rejected, newOrders: orders.size - before, orders: orders.size })}\n`);
  }
}

const generatedAt = new Date().toISOString();
const manifests = [];
for (const month of [...months].sort((left, right) => left - right)) {
  const monthOrders = [...orders.values()].filter((order) => Number(order.period.slice(5, 7)) === month).sort((left, right) => left.code.localeCompare(right.code));
  manifests.push(await writePartition(outputRoot, year, month, monthOrders, originals, generatedAt));
  process.stderr.write(`${JSON.stringify({ phase: "partition", period: `${year}-${String(month).padStart(2, "0")}`, orders: monthOrders.length, records: monthOrders.length * 2 })}\n`);
}
updateCatalog(outputRoot, manifests, generatedAt);
console.log(JSON.stringify({ source: "chilecompra-orders-bulk", year, semester, cutoff, months: [...months].sort(), orders: orders.size, partitions: manifests.map((manifest) => ({ period: manifest.sourcePeriod, records: manifest.recordCount })) }, null, 2));
