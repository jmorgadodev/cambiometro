import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PAGE_SIZE = 50;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(root, "data", "lake", "partitions", "ley-19862");
const outputRoot = join(root, "public", "data", "transferencias");

const text = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const first = (...values) => values.map(text).find(Boolean) ?? null;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function hasFullTransferSource(source = sourceRoot) {
  return existsSync(source) && readdirSync(source, { withFileTypes: true }).some((year) => year.isDirectory());
}

function normalize(rawLine) {
  const raw = rawLine?.data ?? rawLine;
  if (!raw || typeof raw !== "object") return null;
  const id = first(raw.id, rawLine?.id);
  const amount = raw.monto_clp;
  const url = first(raw.url, raw.source_url, raw.evidence?.sourceUrl, rawLine?.evidence?.sourceUrl);
  if (!id || !Number.isSafeInteger(amount) || amount < 0) return null;
  if (!url || !/^https:\/\/registros19862\.gob\.cl\//i.test(url)) {
    throw new Error(`TRANSFER_STATIC_OFFICIAL_URL_INVALID: ${id}`);
  }
  return {
    id,
    fecha: first(raw.fecha, raw.registered_at, rawLine?.occurredAt),
    period: first(raw.period, raw.budget_period, raw.fecha?.slice?.(0, 4)),
    title: first(raw.title, raw.objective),
    description: first(raw.description, raw.legal_framework),
    classification: text(raw.classification),
    emitter_name: text(raw.emitter?.name),
    emitter_rut: text(raw.emitter?.rut_juridico),
    receiver_name: text(raw.receiver?.name),
    receiver_rut: text(raw.receiver?.rut_juridico),
    monto_clp: amount,
    url,
    municipality: text(raw.municipality),
  };
}

async function readJsonLines(file) {
  const rows = [];
  const input = createReadStream(file).pipe(createGunzip());
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) if (line.trim()) rows.push(JSON.parse(line));
  return rows;
}

function findArtifacts(source) {
  const artifacts = [];
  for (const year of readdirSync(source, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const yearRoot = join(source, year.name);
    for (const month of readdirSync(yearRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
      const monthRoot = join(yearRoot, month.name);
      const manifest = JSON.parse(readFileSync(join(monthRoot, "manifest.json"), "utf8"));
      const artifact = manifest.artifacts?.find((item) => item.key?.endsWith(".jsonl.gz"));
      if (!artifact) throw new Error(`TRANSFER_STATIC_PARTITION_ARTIFACT_MISSING: ${year.name}-${month.name}`);
      const file = join(dirname(source), "..", artifact.key);
      if (!existsSync(file)) throw new Error(`TRANSFER_STATIC_ARTIFACT_FILE_MISSING: ${file}`);
      artifacts.push({ period: `${year.name}-${month.name}`, file });
    }
  }
  return artifacts.sort((left, right) => left.period.localeCompare(right.period));
}

function clearOutput(directory) {
  mkdirSync(directory, { recursive: true });
  for (const file of readdirSync(directory)) {
    if (/^p-\d{4}\.json$/.test(file) || ["manifest.json", "search-index.json", "summary.json"].includes(file)) {
      rmSync(join(directory, file), { force: true });
    }
  }
}

export async function buildTransferenciasStatic({ source = sourceRoot, output = outputRoot, generatedAt = new Date().toISOString() } = {}) {
  if (!hasFullTransferSource(source)) return null;
  const rows = [];
  const ids = new Set();
  for (const artifact of findArtifacts(source)) {
    for (const line of await readJsonLines(artifact.file)) {
      const row = normalize(line);
      if (!row) continue;
      if (ids.has(row.id)) throw new Error(`TRANSFER_STATIC_DUPLICATE_ID: ${row.id}`);
      ids.add(row.id);
      rows.push(row);
    }
  }
  if (!rows.length) throw new Error("TRANSFER_STATIC_EMPTY_DATASET");
  rows.sort((a, b) => b.monto_clp - a.monto_clp || String(b.fecha ?? "").localeCompare(String(a.fecha ?? "")) || a.id.localeCompare(b.id));
  clearOutput(output);

  const pages = [];
  for (let offset = 0; offset < rows.length; offset += PAGE_SIZE) {
    const page = Math.floor(offset / PAGE_SIZE) + 1;
    const filename = `p-${String(page).padStart(4, "0")}.json`;
    const content = `${JSON.stringify(rows.slice(offset, offset + PAGE_SIZE))}\n`;
    writeFileSync(join(output, filename), content, "utf8");
    pages.push({ page, path: `/data/transferencias/${filename}`, count: Math.min(PAGE_SIZE, rows.length - offset), sha256: sha256(content) });
  }
  const searchIndex = rows.map((row, index) => ({
    i: index,
    p: Math.floor(index / PAGE_SIZE) + 1,
    y: row.period,
    d: row.fecha,
    e: row.emitter_name,
    er: row.emitter_rut,
    r: row.receiver_name,
    rr: row.receiver_rut,
    t: row.title,
    m: row.monto_clp,
  }));
  const searchContent = `${JSON.stringify(searchIndex)}\n`;
  writeFileSync(join(output, "search-index.json"), searchContent, "utf8");

  const byYear = {};
  const receivers = new Map();
  const emitters = new Map();
  for (const row of rows) {
    const year = row.fecha?.slice(0, 4) ?? row.period ?? "";
    if (year) {
      byYear[year] ??= { count: 0, total: 0 };
      byYear[year].count += 1;
      byYear[year].total += row.monto_clp;
    }
    if (row.receiver_name) {
      const key = `${row.receiver_rut ?? ""}\u0000${row.receiver_name}`;
      const item = receivers.get(key) ?? { name: row.receiver_name, rut: row.receiver_rut ?? "", class: null, total_clp: 0, count: 0, top_emisores: [] };
      item.total_clp += row.monto_clp; item.count += 1; receivers.set(key, item);
    }
    if (row.emitter_name) {
      const key = `${row.emitter_rut ?? ""}\u0000${row.emitter_name}`;
      const item = emitters.get(key) ?? { name: row.emitter_name, rut: row.emitter_rut ?? "", class: null, total_clp: 0, count: 0 };
      item.total_clp += row.monto_clp; item.count += 1; emitters.set(key, item);
    }
  }
  const rank = (a, b) => b.total_clp - a.total_clp || a.name.localeCompare(b.name, "es");
  const summary = {
    generatedAt,
    kpis: {
      total_monto_clp: rows.reduce((sum, row) => sum + row.monto_clp, 0),
      total_transfers: rows.length,
      total_receptores: receivers.size,
      total_emisores: emitters.size,
    },
    by_year: Object.fromEntries(Object.entries(byYear).sort(([a], [b]) => a.localeCompare(b))),
    top_receptores: [...receivers.values()].sort(rank).slice(0, 10),
    top_emisores: [...emitters.values()].sort(rank).slice(0, 10),
    transfers_sample: rows.slice(0, 100),
  };
  const manifest = {
    schemaVersion: 1,
    dataset: "ley-19862-transferencias",
    generatedAt,
    totalRows: rows.length,
    pageSize: PAGE_SIZE,
    totalPages: pages.length,
    pages,
    searchIndex: { path: "/data/transferencias/search-index.json", count: searchIndex.length, sha256: sha256(searchContent) },
    checksumSha256: sha256(rows.map((row) => JSON.stringify(row)).join("\n")),
    expected: {
      totalMontoClp: summary.kpis.total_monto_clp,
      totalReceptores: summary.kpis.total_receptores,
      totalEmisores: summary.kpis.total_emisores,
    },
  };
  writeFileSync(join(output, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  writeFileSync(join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { manifest, summary, output };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const result = await buildTransferenciasStatic();
  if (!result) throw new Error(`TRANSFER_STATIC_SOURCE_MISSING: ${sourceRoot}`);
  console.log(JSON.stringify({ totalRows: result.manifest.totalRows, totalPages: result.manifest.totalPages, checksumSha256: result.manifest.checksumSha256, totalMontoClp: result.manifest.expected.totalMontoClp }, null, 2));
}
