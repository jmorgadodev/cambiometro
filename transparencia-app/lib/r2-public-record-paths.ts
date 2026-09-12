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
