import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

export const PAGE_SIZE = 50;

function textOrNull(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function firstText(...values) {
  for (const value of values) {
    const text = textOrNull(value);
    if (text) return text;
  }
  return null;
}

export function normalizeTransferRecord(line) {
  const raw = line?.data ?? line;
  if (!raw || typeof raw !== "object") return null;
  const id = firstText(raw.id, line?.id);
  const amount = raw.monto_clp;
  const url = firstText(raw.url, raw.source_url, raw.evidence?.sourceUrl, line?.evidence?.sourceUrl);
  const fecha = firstText(raw.fecha, raw.registered_at, line?.occurredAt);
  if (!id || !Number.isSafeInteger(amount) || amount < 0) return null;
  if (!url || !/^https:\/\/registros19862\.gob\.cl\//i.test(url)) {
    throw new Error(`TRANSFER_STATIC_OFFICIAL_URL_INVALID: ${id}`);
  }
  return {
    id,
    fecha,
    period: firstText(raw.period, raw.budget_period, fecha?.slice(0, 4)),
    title: firstText(raw.title, raw.objective),
    description: firstText(raw.description, raw.legal_framework),
    classification: textOrNull(raw.classification),
    emitter_name: textOrNull(raw.emitter?.name),
    emitter_rut: textOrNull(raw.emitter?.rut_juridico),
    receiver_name: textOrNull(raw.receiver?.name),
    receiver_rut: textOrNull(raw.receiver?.rut_juridico),
    monto_clp: amount,
    url,
    municipality: textOrNull(raw.municipality),
  };
}

function stableTransferCompare(a, b) {
  return b.monto_clp - a.monto_clp
    || String(b.fecha ?? "").localeCompare(String(a.fecha ?? ""))
    || a.id.localeCompare(b.id, "en");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalRows(rows) {
  return rows.map((row) => JSON.stringify(row)).join("\n");
}

async function readGzipJsonLines(file) {
  const records = [];
  const input = createReadStream(file).pipe(createGunzip());
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (line.trim()) records.push(JSON.parse(line));
  }
  return records;
}

function findPartitionArtifacts(sourceRoot) {
  if (!existsSync(sourceRoot)) {
    throw new Error(`TRANSFER_STATIC_SOURCE_MISSING: ${sourceRoot}`);
  }
  const artifacts = [];
  for (const year of readdirSync(sourceRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const yearRoot = join(sourceRoot, year.name);
    for (const month of readdirSync(yearRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
      const monthRoot = join(yearRoot, month.name);
      const manifestPath = join(monthRoot, "manifest.json");
      if (!existsSync(manifestPath)) throw new Error(`TRANSFER_STATIC_PARTITION_MANIFEST_MISSING: ${year.name}-${month.name}`);
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      const artifact = manifest.artifacts?.find((item) => item.key?.endsWith(".jsonl.gz"));
      if (!artifact) throw new Error(`TRANSFER_STATIC_PARTITION_ARTIFACT_MISSING: ${year.name}-${month.name}`);
      const file = join(dirname(sourceRoot), "..", artifact.key);
      if (!existsSync(file)) throw new Error(`TRANSFER_STATIC_ARTIFACT_FILE_MISSING: ${file}`);
      artifacts.push({ period: `${year.name}-${month.name}`, file });
    }
  }
  return artifacts.sort((a, b) => a.period.localeCompare(b.period));
}

function clearGeneratedFiles(outputRoot) {
  mkdirSync(outputRoot, { recursive: true });
  for (const name of readdirSync(outputRoot)) {
    if (/^p-\d{4}\.json$/.test(name) || ["manifest.json", "search-index.json", "summary.json"].includes(name)) {
      rmSync(join(outputRoot, name), { force: true });
    }
  }
}

export async function buildTransferStatic({ root = resolve(dirname(fileURLToPath(import.meta.url)), ".."), sourceRoot, outputRoot, generatedAt = new Date().toISOString() } = {}) {
  const resolvedSourceRoot = sourceRoot ?? join(root, "data", "lake", "partitions", "ley-19862");
  const resolvedOutputRoot = outputRoot ?? join(root, "public", "data", "transferencias");
  const artifacts = findPartitionArtifacts(resolvedSourceRoot);
  const rows = [];
  const seen = new Set();
  for (const artifact of artifacts) {
    for (const line of await readGzipJsonLines(artifact.file)) {
      const row = normalizeTransferRecord(line);
      if (!row) continue;
      if (seen.has(row.id)) throw new Error(`TRANSFER_STATIC_DUPLICATE_ID: ${row.id}`);
      seen.add(row.id);
      rows.push(row);
    }
  }
  if (rows.length === 0) throw new Error("TRANSFER_STATIC_EMPTY_DATASET");
  // El universo oficial puede crecer durante el mes. La fuente full recién
  // descargada es la autoridad del release; la coherencia se valida aquí
  // (IDs, montos y URLs) y el manifest generado se convierte en el contrato
  // que consumen Pages y el navegador. El snapshot histórico versionado se
  // conserva como fixture de regresión, no como límite artificial del ETL.
  // Sólo reemplazar el último artefacto válido después de pasar la guardia de
  // coherencia. Un backfill incompleto no debe borrar el preview local sano.
  clearGeneratedFiles(resolvedOutputRoot);
  rows.sort(stableTransferCompare);
  const sourceText = canonicalRows(rows);
  const pages = [];
  for (let offset = 0; offset < rows.length; offset += PAGE_SIZE) {
    const page = Math.floor(offset / PAGE_SIZE) + 1;
    const pageRows = rows.slice(offset, offset + PAGE_SIZE);
    const filename = `p-${String(page).padStart(4, "0")}.json`;
    const text = `${JSON.stringify(pageRows)}\n`;
    writeFileSync(join(resolvedOutputRoot, filename), text, "utf8");
    pages.push({ page, path: `/data/transferencias/${filename}`, count: pageRows.length, sha256: sha256(text) });
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
  const searchText = `${JSON.stringify(searchIndex)}\n`;
  writeFileSync(join(resolvedOutputRoot, "search-index.json"), searchText, "utf8");
  const manifest = {
    schemaVersion: 1,
    dataset: "ley-19862-transferencias",
    generatedAt,
    source: { method: "official-monthly-csv", periods: artifacts.map((item) => item.period) },
    totalRows: rows.length,
    pageSize: PAGE_SIZE,
    totalPages: pages.length,
    pages,
    searchIndex: { path: "/data/transferencias/search-index.json", count: searchIndex.length, sha256: sha256(searchText) },
    checksumSha256: sha256(sourceText),
    expected: { totalMontoClp: rows.reduce((sum, row) => sum + row.monto_clp, 0) },
  };
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
      const current = receivers.get(key) ?? { name: row.receiver_name, rut: row.receiver_rut ?? "", class: null, total_clp: 0, count: 0, top_emisores: [] };
      current.total_clp += row.monto_clp;
      current.count += 1;
      receivers.set(key, current);
    }
    if (row.emitter_name) {
      const key = `${row.emitter_rut ?? ""}\u0000${row.emitter_name}`;
      const current = emitters.get(key) ?? { name: row.emitter_name, rut: row.emitter_rut ?? "", class: null, total_clp: 0, count: 0 };
      current.total_clp += row.monto_clp;
      current.count += 1;
      emitters.set(key, current);
    }
  }
  const rank = (left, right) => right.total_clp - left.total_clp || left.name.localeCompare(right.name, "es");
  writeFileSync(join(resolvedOutputRoot, "summary.json"), `${JSON.stringify({
    generatedAt,
    kpis: {
      total_monto_clp: manifest.expected.totalMontoClp,
      total_transfers: rows.length,
      total_receptores: receivers.size,
      total_emisores: emitters.size,
    },
    by_year: Object.fromEntries(Object.entries(byYear).sort(([left], [right]) => left.localeCompare(right))),
    top_receptores: [...receivers.values()].sort(rank).slice(0, 10),
    top_emisores: [...emitters.values()].sort(rank).slice(0, 10),
    transfers_sample: rows.slice(0, 100),
  }, null, 2)}\n`, "utf8");
  writeFileSync(join(resolvedOutputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { ...manifest, outputRoot: resolvedOutputRoot };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const result = await buildTransferStatic();
  console.log(JSON.stringify({ outputRoot: result.outputRoot, totalRows: result.totalRows, totalPages: result.totalPages, checksumSha256: result.checksumSha256, totalMontoClp: result.expected.totalMontoClp }, null, 2));
}
