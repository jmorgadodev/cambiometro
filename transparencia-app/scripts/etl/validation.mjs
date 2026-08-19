import { createHash } from "node:crypto";
import { stableStringify } from "./core.mjs";

function fail(code, detail) {
  throw new Error(`${code}: ${detail}`);
}

function sourceUrl(record) {
  return record?.url ?? record?.fuente ?? record?.evidence?.sourceUrl ?? null;
}

function recordDate(record) {
  return record?.fecha ?? record?.occurredAt ?? record?.period?.from ?? null;
}

/**
 * @param {{
 *   sourceId: string,
 *   records: Array<Record<string, any>>,
 *   minimumCount?: number,
 *   previousCount?: number | null,
 *   minimumRetainedRatio?: number
 * }} options
 */
export function validatePublication({
  sourceId,
  records,
  minimumCount = 1,
  previousCount = null,
  minimumRetainedRatio = 0.5,
}) {
  if (!sourceId || !Array.isArray(records)) fail("ETL_INVALID_INPUT", "sourceId y records son obligatorios");
  if (!Number.isSafeInteger(minimumCount) || minimumCount < 0) fail("ETL_INVALID_INPUT", "minimumCount invalido");
  if (records.length < minimumCount) fail("ETL_EMPTY_SOURCE", `${sourceId} produjo ${records.length} registros; minimo ${minimumCount}`);

  const ids = new Set();
  for (const record of records) {
    const id = typeof record?.id === "string" ? record.id.trim() : "";
    if (!id) fail("ETL_MISSING_ID", `${sourceId} contiene un registro sin id`);
    if (ids.has(id)) fail("ETL_DUPLICATE_ID", `${sourceId} repitio ${id}`);
    ids.add(id);

    const evidence = sourceUrl(record);
    if (typeof evidence !== "string" || !/^https:\/\//i.test(evidence)) {
      fail("ETL_MISSING_SOURCE", `${sourceId}/${id} no tiene una URL HTTPS oficial`);
    }

    const date = recordDate(record);
    if (date !== null && !/^\d{4}-\d{2}-\d{2}/.test(String(date))) {
      fail("ETL_INVALID_DATE", `${sourceId}/${id} tiene fecha invalida`);
    }
  }

  if (Number.isSafeInteger(previousCount) && previousCount > 0) {
    const retainedRatio = records.length / previousCount;
    if (retainedRatio < minimumRetainedRatio) {
      fail("ETL_UNEXPECTED_DROP", `${sourceId} retuvo ${(retainedRatio * 100).toFixed(1)}% del lote anterior`);
    }
  }

  const ordered = [...records].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const checksum = createHash("sha256");
  ordered.forEach((record, index) => {
    if (index > 0) checksum.update("\n");
    checksum.update(stableStringify(record));
  });
  const checksumSha256 = checksum.digest("hex");
  return { sourceId, recordCount: records.length, checksumSha256, status: "valid" };
}

export function validateAsset({ name, size, recordCount, minimumBytes = 128, minimumCount = 1 }) {
  const valid = typeof name === "string"
    && name.length > 0
    && Number.isSafeInteger(size)
    && size >= minimumBytes
    && Number.isSafeInteger(recordCount)
    && recordCount >= minimumCount;
  if (!valid) fail("ETL_INVALID_ASSET", `${name || "asset"} tiene ${size ?? "?"} bytes y ${recordCount ?? "?"} registros`);
  return { name, size, recordCount, status: "valid" };
}

export function assertSuccessfulRun(errors) {
  if (!Array.isArray(errors)) fail("ETL_INVALID_INPUT", "errors debe ser un arreglo");
  if (errors.length > 0) fail("ETL_SOURCE_FAILURE", errors.join(" | "));
  return { status: "success" };
}
