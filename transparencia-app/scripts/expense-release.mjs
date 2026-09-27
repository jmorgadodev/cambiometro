import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { latestEligibleCamaraPeriod } from "./etl/expense-window.mjs";

const EXPENSE_SOURCES = ["gastos_camara", "gastos_senado"];
const ALL_ZERO_MATRIX_MIN_ROWS = 100;
const ALL_ZERO_MATRIX_MIN_POLITICIANS = 20;
const ALL_ZERO_MATRIX_MIN_ITEMS = 10;

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function periodFor(record) {
  const period = String(record?.periodo ?? record?.period ?? "").slice(0, 7);
  if (/^\d{4}-\d{2}$/.test(period)) return period;
  const date = String(record?.fecha ?? "").slice(0, 7);
  return /^\d{4}-\d{2}$/.test(date) ? date : "";
}

export function isValidExpenseAmount(value, sourceId) {
  if (value === null || value === undefined) return true;
  return Number.isSafeInteger(value) && (sourceId === "gastos_senado" || value >= 0);
}

/**
 * Keep only the fields needed by the static profile and the public evidence
 * link. Raw ETL payloads never cross into the Pages build.
 */
export function compactExpenseRecord(record, sourceId) {
  const id = String(record?.id ?? "").trim();
  const periodo = periodFor(record);
  const item = String(record?.item ?? record?.categoria ?? record?.concepto ?? record?.title ?? "").trim();
  const rawAmount = record?.monto_clp;
  const monto = rawAmount === null || rawAmount === undefined ? null : Number(rawAmount);
  const url = String(record?.url ?? "").trim();
  const nombre = String(record?.nombre ?? record?.person?.name ?? "").replace(/\s+/g, " ").trim();
  const diputadoId = String(record?.diputado_id ?? "").trim();

  const amountInvalid = !isValidExpenseAmount(monto, sourceId);
  if (!id || !periodo || !item || amountInvalid || !/^https:\/\//i.test(url)) return null;
  if (sourceId === "gastos_camara" && !/^\d+$/.test(diputadoId)) return null;

  return {
    id,
    ...(sourceId === "gastos_camara" ? { diputado_id: diputadoId } : {}),
    nombre: nombre || undefined,
    fecha: String(record?.fecha ?? `${periodo}-01`).slice(0, 10),
    periodo,
    item,
    monto_clp: monto,
    url,
    fuente: String(record?.fuente ?? sourceId).trim(),
  };
}

export function buildExpenseSubset({ sourceId, records, generatedAt = new Date().toISOString() }) {
  if (!EXPENSE_SOURCES.includes(sourceId)) throw new Error(`EXPENSE_SOURCE_UNKNOWN: ${sourceId}`);
  const compact = records
    .map((record) => compactExpenseRecord(record, sourceId))
    .filter(Boolean)
    .sort((left, right) => left.id.localeCompare(right.id));
  const ids = new Set(compact.map((record) => record.id));
  if (ids.size !== compact.length) throw new Error(`EXPENSE_DUPLICATE_ID: ${sourceId}`);

  const periods = [...new Set(compact.map((record) => record.periodo))].sort();
  const politicians = new Set(compact
    .map((record) => sourceId === "gastos_camara" ? record.diputado_id : record.nombre)
    .filter(Boolean));
  const subset = {
    schemaVersion: 1,
    sourceId,
    generatedAt,
    recordCount: compact.length,
    politicianCount: politicians.size,
    periods,
    records: compact,
  };
  return { ...subset, checksumSha256: sha256Json(subset) };
}

export function buildExpensePeriodShards(subset) {
  if (!EXPENSE_SOURCES.includes(subset?.sourceId) || !Array.isArray(subset?.records)) {
    throw new Error("EXPENSE_PERIOD_SHARD_SOURCE_MISMATCH");
  }
  const byPeriod = new Map();
  for (const record of subset.records) {
    if (record?.sourceId && record.sourceId !== subset.sourceId) throw new Error("EXPENSE_PERIOD_SHARD_SOURCE_MISMATCH");
    const period = String(record?.periodo ?? "");
    if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(period)) throw new Error("EXPENSE_PERIOD_SHARD_PERIOD_INVALID");
    const rows = byPeriod.get(period) ?? [];
    rows.push(record);
    byPeriod.set(period, rows);
  }
  return [...byPeriod.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([period, records]) => ({
      period,
      payload: {
        sourceId: subset.sourceId,
        period,
        recordCount: records.length,
        records: records.sort((left, right) => String(right.fecha ?? "").localeCompare(String(left.fecha ?? "")) || String(right.id).localeCompare(String(left.id))),
      },
    }));
}

export function readExpenseSubset(root, sourceId) {
  const path = join(root, "data", "lake-subsets", `${sourceId.replace("gastos_", "gastos-")}.subset.json`);
  if (!existsSync(path)) return null;
  const subset = JSON.parse(readFileSync(path, "utf8"));
  if (subset?.sourceId !== sourceId || !Array.isArray(subset.records)) throw new Error(`EXPENSE_SUBSET_INVALID: ${sourceId}`);
  return subset;
}

function broadAllZeroPeriods(sourceId, records) {
  if (sourceId !== "gastos_camara") return new Set();
  const periods = new Map();
  for (const record of records) {
    const rows = periods.get(record.periodo) ?? [];
    rows.push(record);
    periods.set(record.periodo, rows);
  }
  return new Set([...periods].filter(([, rows]) =>
    rows.length >= ALL_ZERO_MATRIX_MIN_ROWS
      && new Set(rows.map((row) => row.diputado_id)).size >= ALL_ZERO_MATRIX_MIN_POLITICIANS
      && new Set(rows.map((row) => row.item)).size >= ALL_ZERO_MATRIX_MIN_ITEMS
      && rows.every((row) => row.monto_clp === 0),
  ).map(([period]) => period));
}

export function sanitizeExpenseSubsetForPublication(subset) {
  const sourceId = subset?.sourceId;
  if (!EXPENSE_SOURCES.includes(sourceId) || !Array.isArray(subset?.records)) {
    throw new Error("EXPENSE_SUBSET_INVALID_FOR_PUBLICATION");
  }
  if (!Number.isSafeInteger(subset.recordCount) || subset.recordCount !== subset.records.length) {
    throw new Error(`EXPENSE_SUBSET_COUNT_MISMATCH:${sourceId}`);
  }
  const { checksumSha256, ...rawPayload } = subset;
  if (!/^[a-f0-9]{64}$/i.test(String(checksumSha256 ?? "")) || sha256Json(rawPayload) !== checksumSha256) {
    throw new Error(`EXPENSE_SUBSET_CHECKSUM_MISMATCH:${sourceId}`);
  }

  const records = subset.records.map((record) => compactExpenseRecord(record, sourceId));
  if (records.some((record) => !record)) throw new Error(`EXPENSE_SUBSET_ROW_INVALID:${sourceId}`);
  const validRecords = records;
  const ids = new Set(validRecords.map((record) => record.id));
  if (ids.size !== validRecords.length) throw new Error(`EXPENSE_DUPLICATE_ID:${sourceId}`);

  const rowsByPeriod = new Map();
  for (const record of validRecords) rowsByPeriod.set(record.periodo, (rowsByPeriod.get(record.periodo) ?? 0) + 1);
  const excludedPeriods = [];
  let latestEligible = null;
  const zeroPeriods = broadAllZeroPeriods(sourceId, validRecords);
  if (sourceId === "gastos_camara") {
    try {
      latestEligible = latestEligibleCamaraPeriod(subset.generatedAt);
    } catch {
      throw new Error("EXPENSE_RELEASE_TIMESTAMP_INVALID:gastos_camara");
    }
    for (const [period, rows] of [...rowsByPeriod].sort(([left], [right]) => left.localeCompare(right))) {
      if (period > latestEligible) excludedPeriods.push({ period, reason: "not-yet-published", rows });
      else if (zeroPeriods.has(period)) excludedPeriods.push({ period, reason: "broad-all-zero-matrix", rows });
    }
  }

  const excluded = new Set(excludedPeriods.map((item) => item.period));
  const publishedRecords = validRecords.filter((record) => !excluded.has(record.periodo));
  const periods = [...new Set(publishedRecords.map((record) => record.periodo))].sort();
  const politicians = new Set(publishedRecords
    .map((record) => sourceId === "gastos_camara" ? record.diputado_id : record.nombre)
    .filter(Boolean));
  const payload = {
    ...rawPayload,
    recordCount: publishedRecords.length,
    politicianCount: politicians.size,
    periods,
    records: publishedRecords,
  };
  return { subset: { ...payload, checksumSha256: sha256Json(payload) }, excludedPeriods };
}

export function readExpenseSubsetForPublication(root, sourceId) {
  const subset = readExpenseSubset(root, sourceId);
  return subset ? sanitizeExpenseSubsetForPublication(subset) : null;
}

export function writeExpensePeriodArtifacts(root, generatedAt = new Date().toISOString()) {
  const expensePeriodRoot = join(root, "data", "lake-subsets", "expense-periods");
  const index = {
    schemaVersion: 1,
    dataset: "gastos-operacionales-por-periodo",
    generatedAt,
    sources: [],
  };
  const published = [];

  for (const sourceId of EXPENSE_SOURCES) {
    const result = readExpenseSubsetForPublication(root, sourceId);
    const source = { sourceId, subset: result?.subset ?? null, excludedPeriods: result?.excludedPeriods ?? [], periods: [] };
    if (source.subset) {
      for (const shard of buildExpensePeriodShards(source.subset)) {
        const path = `data/lake-subsets/expense-periods/${sourceId}/${shard.period}.json`;
        const outputPath = join(root, path);
        mkdirSync(join(expensePeriodRoot, sourceId), { recursive: true });
        writeFileSync(outputPath, `${JSON.stringify(shard.payload)}\n`);
        source.periods.push({ period: shard.period, path, recordCount: shard.payload.recordCount });
      }
    }
    index.sources.push({ sourceId, periods: source.periods });
    published.push(source);
  }

  mkdirSync(expensePeriodRoot, { recursive: true });
  writeFileSync(join(expensePeriodRoot, "manifest.json"), `${JSON.stringify(index)}\n`);
  return { index, sources: published };
}

export function readExpenseSnapshot(root) {
  const candidates = [join(root, "data", "etl", "latest.json"), join(root, "data", "snapshot.json")];
  for (const path of candidates) {
    if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8"));
  }
  return null;
}

export { EXPENSE_SOURCES };
