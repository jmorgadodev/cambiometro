import { createHash } from "node:crypto";
import { stableStringify } from "./core.mjs";

/**
 * Guarda de publicación por fuente.
 *
 * Las fuentes históricas suelen recibirse por ventana y por eso no se compara
 * su tamaño con el histórico completo. Las fuentes que representan un lote
 * completo sí deben conservar una proporción mínima del lote anterior.
 */
export function validateSourceRelease({
  sourceId,
  records,
  previousRecords = [],
  minimumCount = 1,
  preserveHistory = false,
  minimumRetainedRatio = 0.5,
}) {
  if (!sourceId || !Array.isArray(records) || !Array.isArray(previousRecords)) {
    throw new Error("SOURCE_RELEASE_INVALID_INPUT");
  }
  if (!Number.isSafeInteger(minimumCount) || minimumCount < 0) throw new Error("SOURCE_RELEASE_INVALID_MINIMUM");
  if (records.length < minimumCount) {
    throw new Error(`SOURCE_RELEASE_EMPTY:${sourceId}:${records.length}:${minimumCount}`);
  }

  const ids = new Set();
  for (const record of records) {
    const id = String(record?.id ?? "").trim();
    if (!id) throw new Error(`SOURCE_RELEASE_MISSING_ID:${sourceId}`);
    if (ids.has(id)) throw new Error(`SOURCE_RELEASE_DUPLICATE_ID:${sourceId}:${id}`);
    ids.add(id);
  }

  if (records.length === 0 && previousRecords.length > 0) {
    throw new Error(`SOURCE_RELEASE_EMPTY_REPLACES_PREVIOUS:${sourceId}`);
  }

  if (!preserveHistory && previousRecords.length > 0 && records.length / previousRecords.length < minimumRetainedRatio) {
    throw new Error(`SOURCE_RELEASE_UNEXPECTED_DROP:${sourceId}:${records.length}/${previousRecords.length}`);
  }

  const checksum = createHash("sha256");
  [...records]
    .sort((left, right) => String(left.id).localeCompare(String(right.id)))
    .forEach((record, index) => {
      if (index > 0) checksum.update("\n");
      checksum.update(stableStringify(record));
    });

  return {
    sourceId,
    recordCount: records.length,
    previousCount: previousRecords.length,
    preservedHistory: preserveHistory,
    checksumSha256: checksum.digest("hex"),
    status: "valid",
  };
}
