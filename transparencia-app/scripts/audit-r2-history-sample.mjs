import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { buildR2History, readR2SearchIndexRowsAtPositions } from "./etl/r2-history.mjs";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function requiredOption(name) {
  const value = option(name);
  if (!value?.trim()) throw new Error(`R2_HISTORY_MISSING_OPTION:${name}`);
  return value.trim();
}

function integerOption(name, fallback, min, max) {
  const value = Number(option(name, String(fallback)));
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`R2_HISTORY_INVALID_OPTION:${name}`);
  return value;
}

function normalizeTerms(query) {
  return [...new Set(String(query ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CL")
    .match(/[\p{L}\p{N}]{2,}/gu) ?? [])];
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function runWrangler(args) {
  const wrangler = resolve("node_modules/wrangler/bin/wrangler.js");
  const result = spawnSync(process.execPath, [wrangler, ...args, "--remote"], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`R2_HISTORY_R2_READ_FAILED:${args.join(" ")}:${result.stderr?.trim() ?? result.status}`);
  }
}

function createRemoteReader(bucket) {
  const temp = mkdtempSync(join(tmpdir(), "cambiometro-r2-history-"));
  const cache = new Map();
  const read = (key) => {
    if (cache.has(key)) return cache.get(key);
    const filePath = join(temp, `${String(cache.size).padStart(4, "0")}.json`);
    runWrangler(["r2", "object", "get", `${bucket}/${key}`, "--file", filePath]);
    const data = readFileSync(filePath);
    const value = JSON.parse(data.toString("utf8"));
    const result = { value, checksum: sha256(data), key };
    cache.set(key, result);
    return result;
  };
  return {
    readJson: async (key) => read(key).value,
    readJsonWithMetadata: (key) => read(key),
    reads: () => [...cache.values()].map(({ key }) => key),
    cleanup: () => rmSync(temp, { recursive: true, force: true }),
  };
}

function shardKeys(index, token) {
  const value = index.shards?.[token.slice(0, 2)];
  return Array.isArray(value) ? value : value ? [value] : [];
}

function tokenPositions(index, token, reader) {
  const keys = shardKeys(index, token);
  for (const key of keys) {
    const shard = reader.readJsonWithMetadata(key).value;
    const entry = Array.isArray(shard) ? shard.find(([name]) => name === token) : null;
    if (entry) return Array.isArray(entry[1]) ? entry[1] : [];
  }
  return [];
}

function intersectPositions(positionSets) {
  if (positionSets.length === 0 || positionSets.some((positions) => positions.length === 0)) return [];
  const [first, ...rest] = positionSets.map((positions) => new Set(positions));
  return [...first].filter((position) => rest.every((set) => set.has(position))).sort((left, right) => left - right);
}

function positionsWithinPageLimit(index, positions, maxPages) {
  const pages = [...(index.pages ?? [])].sort((left, right) => Number(left.page) - Number(right.page));
  const acceptedPages = new Set();
  const selected = [];
  let base = 0;
  for (const page of pages) {
    const end = base + Number(page.count);
    for (const position of positions) {
      if (position < base || position >= end || selected.includes(position)) continue;
      if (!acceptedPages.has(page.key) && acceptedPages.size >= maxPages) continue;
      acceptedPages.add(page.key);
      selected.push(position);
    }
    base = end;
    if (acceptedPages.size >= maxPages && selected.length > 0) break;
  }
  return selected.sort((left, right) => left - right);
}

async function loadRelease({ bucket, dataset, version, query, limit, maxPages, reader }) {
  const prefix = `projections/${dataset}/versions/${version}/search_index`;
  const indexKey = `${prefix}.json`;
  const indexAsset = reader.readJsonWithMetadata(indexKey);
  const index = indexAsset.value;
  const terms = normalizeTerms(query);
  const positionSets = terms.map((term) => tokenPositions(index, term, reader));
  const positions = positionsWithinPageLimit(index, intersectPositions(positionSets).slice(0, limit * 25), maxPages);
  const selected = await readR2SearchIndexRowsAtPositions(index, positions, reader.readJson);
  return {
    period: version,
    releaseId: `${dataset}@${version}`,
    checksum: indexAsset.checksum,
    records: selected.map(({ position, record }) => ({
      personKey: record.id,
      nombreOriginal: record.n,
      organismoOriginal: record.o,
      cargoOriginal: record.c,
      montoBruto: record.b,
      periodo: record.p,
      r2Position: position,
    })),
    indexKey,
  };
}

const query = requiredOption("--query");
const bucket = option("--bucket", "transparencia-public-data");
const dataset = option("--dataset", "funcionarios-v1");
const fromVersion = requiredOption("--from-version");
const toVersion = requiredOption("--to-version");
const limit = integerOption("--limit", 10, 1, 100);
const maxPages = integerOption("--max-pages", 4, 1, 12);
const reader = createRemoteReader(bucket);
try {
  const periods = await Promise.all([
    loadRelease({ bucket, dataset, version: fromVersion, query, limit, maxPages, reader }),
    loadRelease({ bucket, dataset, version: toVersion, query, limit, maxPages, reader }),
  ]);
  const history = buildR2History(periods, { keyFields: ["personKey"] });
  const compact = (record) => ({
    id: record?.personKey ?? record?.original?.personKey ?? null,
    nombre: record?.nombreOriginal ?? record?.original?.nombreOriginal ?? null,
    organismo: record?.organismoOriginal ?? record?.original?.organismoOriginal ?? null,
    periodo: record?.periodo ?? record?.original?.periodo ?? null,
    montoBruto: record?.montoBruto ?? record?.original?.montoBruto ?? null,
  });
  console.log(JSON.stringify({
    mode: "read-only",
    dataset,
    query,
    releases: periods.map((period) => ({ period: period.period, releaseId: period.releaseId, checksum: period.checksum, rows: period.records.length, indexKey: period.indexKey })),
    r2ObjectsRead: reader.reads(),
    selectedRows: history.periods.map((period, index) => ({ period: period.period, rows: periods[index].records.map(compact) })),
    comparison: history.comparisons[0],
  }, null, 2));
} finally {
  reader.cleanup();
}
