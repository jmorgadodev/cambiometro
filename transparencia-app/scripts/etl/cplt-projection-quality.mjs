const PERIOD_FILTER_PREFIX = "periodo:";

function integer(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function declaredPeriods(summary) {
  return new Set(
    (Array.isArray(summary?.periods) ? summary.periods : [])
      .map((item) => String(item?.period ?? "").trim())
      .filter(Boolean),
  );
}

function periodFilters(index) {
  return Object.entries(index?.filters ?? {})
    .filter(([key, descriptor]) => key.startsWith(PERIOD_FILTER_PREFIX) && descriptor && typeof descriptor === "object")
    .map(([key, descriptor]) => ({ period: key.slice(PERIOD_FILTER_PREFIX.length), count: integer(descriptor.count) ?? 0 }));
}

function coverageSummary(manifest) {
  const coverage = Array.isArray(manifest?.coverage) ? manifest.coverage : [];
  const seen = new Set();
  let duplicateIds = 0;
  let recordRows = 0;
  let available = 0;
  let unavailable = 0;
  for (const row of coverage) {
    const id = String(row?.communeId ?? row?.administrationId ?? row?.cut ?? "").trim();
    if (id && seen.has(id)) duplicateIds += 1;
    if (id) seen.add(id);
    const count = integer(row?.recordCount);
    if (count !== null) recordRows += count;
    if (row?.status === "available") available += 1;
    if (row?.status === "unavailable") unavailable += 1;
  }
  return {
    declared: coverage.length,
    available,
    unavailable,
    recordRows,
    duplicateIds,
  };
}

/**
 * Audits only manifest/index/summary metadata. It never reads a data page and
 * therefore can be used before a large release is promoted or downloaded.
 */
export function auditCpltProjection({ manifest, index, summary }) {
  const manifestRows = integer(manifest?.recordCount);
  const coverage = coverageSummary(manifest);
  const indexRows = integer(index?.totalRows);
  const pageRows = Array.isArray(index?.pages)
    ? index.pages.reduce((total, page) => total + (integer(page?.count) ?? 0), 0)
    : null;
  const declared = declaredPeriods(summary);
  const indexedPeriods = periodFilters(index);
  const invalidPeriodFilters = indexedPeriods.filter((item) => !declared.has(item.period));
  const indexedPeriodRows = indexedPeriods.reduce((total, item) => total + item.count, 0);
  const invalidPeriodRows = invalidPeriodFilters.reduce((total, item) => total + item.count, 0);
  const indexedQuality = index?.quality && typeof index.quality === "object" ? index.quality : null;
  const qualityInvalidPeriodRows = integer(indexedQuality?.invalidPeriodRows) ?? 0;
  const structuralIssues = [];

  if (manifestRows === null) structuralIssues.push("manifest_record_count_missing");
  if (indexRows === null) structuralIssues.push("index_total_rows_missing");
  if (manifestRows !== null && indexRows !== null && manifestRows !== indexRows) structuralIssues.push("manifest_index_count_mismatch");
  if (!Array.isArray(index?.pages) || index.pages.length === 0) structuralIssues.push("index_pages_missing");
  if (pageRows !== null && indexRows !== null && pageRows !== indexRows) structuralIssues.push("page_count_sum_mismatch");
  if (declared.size === 0) structuralIssues.push("declared_periods_missing");
  if (indexedPeriodRows !== null && indexRows !== null && indexedPeriodRows !== indexRows) structuralIssues.push("period_filter_sum_mismatch");
  if (invalidPeriodRows > 0) structuralIssues.push("period_filters_outside_declared_release");
  if (qualityInvalidPeriodRows > 0) structuralIssues.push("rows_with_invalid_period");
  if (coverage.declared === 0) structuralIssues.push("coverage_missing");
  if (coverage.duplicateIds > 0) structuralIssues.push("coverage_duplicate_entities");
  if (manifestRows !== null && coverage.declared > 0 && coverage.recordRows !== manifestRows) {
    structuralIssues.push("coverage_record_count_sum_mismatch");
  }

  const quality = indexedQuality
    ? {
      recordsWithIssues: integer(index.quality.recordsWithIssues) ?? 0,
      correctedRows: integer(index.quality.correctedRows) ?? 0,
      observedRows: integer(index.quality.observedRows) ?? 0,
      invalidPeriodRows: qualityInvalidPeriodRows,
      byIssue: index.quality.byIssue && typeof index.quality.byIssue === "object" ? index.quality.byIssue : {},
    }
    : null;

  return {
    schemaVersion: 1,
    status: structuralIssues.length === 0 ? "ready" : "blocked",
    promotionAllowed: structuralIssues.length === 0,
    manifestRows,
    coverage,
    indexRows,
    pageCount: Array.isArray(index?.pages) ? index.pages.length : 0,
    pageRows,
    declaredPeriodCount: declared.size,
    indexedPeriodCount: indexedPeriods.length,
    indexedPeriodRows,
    invalidPeriodFilterCount: invalidPeriodFilters.length,
    invalidPeriodRows,
    invalidPeriodSample: invalidPeriodFilters.slice(0, 12),
    quality,
    structuralIssues,
  };
}
