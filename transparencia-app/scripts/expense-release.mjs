import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const EXPENSE_SOURCES = ["gastos_camara", "gastos_senado"];

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function periodFor(record) {
  const period = String(record?.periodo ?? record?.period ?? "").slice(0, 7);
  if (/^\d{4}-\d{2}$/.test(period)) return period;
  const date = String(record?.fecha ?? "").slice(0, 7);
  return /^\d{4}-\d{2}$/.test(date) ? date : "";
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
  const monto = rawAmount === null || rawAmount === undefined ? NaN : Number(rawAmount);
  const url = String(record?.url ?? "").trim();
  const nombre = String(record?.nombre ?? record?.person?.name ?? "").replace(/\s+/g, " ").trim();
  const diputadoId = String(record?.diputado_id ?? "").trim();

  if (!id || !periodo || !item || !Number.isSafeInteger(monto) || monto < 0 || !/^https:\/\//i.test(url)) return null;
  if (sourceId === "gastos_camara" && !/^\d+$/.test(diputadoId)) return null;
  if (sourceId === "gastos_senado" && !nombre) return null;

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
  const politicians = new Set(compact.map((record) => sourceId === "gastos_camara" ? record.diputado_id : record.nombre));
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

export function readExpenseSubset(root, sourceId) {
  const path = join(root, "data", "lake-subsets", `${sourceId.replace("gastos_", "gastos-")}.subset.json`);
  if (!existsSync(path)) return null;
  const subset = JSON.parse(readFileSync(path, "utf8"));
  if (subset?.sourceId !== sourceId || !Array.isArray(subset.records)) throw new Error(`EXPENSE_SUBSET_INVALID: ${sourceId}`);
  return subset;
}

export function readExpenseSnapshot(root) {
  const candidates = [join(root, "data", "etl", "latest.json"), join(root, "data", "snapshot.json")];
  for (const path of candidates) {
    if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8"));
  }
  return null;
}

export { EXPENSE_SOURCES };
