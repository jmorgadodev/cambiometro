/**
 * Paths used by the public API when reading compact static records from R2.
 *
 * Movimientos is intentionally explicit because its ETL publishes the
 * authoritative payload at data/movimientos.json instead of under the lake
 * projection directory. Keeping this mapping narrow prevents unrelated
 * sources from silently accepting an incorrectly shaped artifact.
 */
export function staticRecordCandidatePaths(source: string) {
  const paths = [
    `data/lake/projections/v1/${source}.json`,
    `data/lake-subsets/${source}.subset.json`,
  ];
  if (source === "movimientos") paths.push("data/movimientos.json");
  return paths;
}

/**
 * Extract rows from compact JSON payloads published by the static site.
 * Most datasets expose `records`, while Movimientos keeps its historical
 * contract under `movimientos`. Preserve both contracts at the API boundary.
 */
export function staticRecordRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const object = payload as Record<string, unknown>;
  if (Array.isArray(object.records)) return object.records;
  if (Array.isArray(object.movimientos)) return object.movimientos;
  return [];
}
