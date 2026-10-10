const safeCount = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;

export function summarizeSourcePartitions(partitions, sourceId, expectedTotal) {
  const declaredTotal = safeCount(expectedTotal);
  if (!Array.isArray(partitions) || typeof sourceId !== "string" || !sourceId || declaredTotal === null) return null;
  const sourcePartitions = partitions.filter((partition) => partition?.sourceId === sourceId);
  if (sourcePartitions.length === 0) return null;

  const rowsByPeriod = new Map();
  for (const partition of sourcePartitions) {
    const period = typeof partition.period === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(partition.period)
      ? partition.period
      : null;
    const rows = safeCount(partition.recordCount);
    if (!period || rows === null) return null;
    rowsByPeriod.set(period, (rowsByPeriod.get(period) ?? 0) + rows);
  }

  const periods = [...rowsByPeriod.keys()].sort();
  const totalRows = [...rowsByPeriod.values()].reduce((sum, rows) => sum + rows, 0);
  if (!Number.isSafeInteger(totalRows) || totalRows !== declaredTotal) return null;
  const firstPeriod = periods[0];
  const latestPeriod = periods.at(-1);
  const monthIndex = (period) => Number(period.slice(0, 4)) * 12 + Number(period.slice(5, 7)) - 1;
  const spanMonths = monthIndex(latestPeriod) - monthIndex(firstPeriod) + 1;
  const isContinuous = periods.length === spanMonths;

  return {
    totalRows,
    availablePeriods: periods.length,
    firstPeriod,
    latestPeriod,
    latestRows: rowsByPeriod.get(latestPeriod),
    isContinuous,
    periodLabel: `${firstPeriod} a ${latestPeriod} · ${periods.length} cortes disponibles${isContinuous ? "" : "; serie discontinua"}`,
  };
}

export function cpltR2ReleaseCount(manifest) {
  if (manifest?.sourceId !== "transparencia-activa") return null;
  const recordCount = safeCount(manifest.recordCount);
  if (recordCount === null || safeCount(manifest.searchIndex?.totalRows) !== recordCount) return null;
  if (!Array.isArray(manifest.sources) || manifest.sources.length === 0) return null;
  const hasInvalidSource = manifest.sources.some((entry) => typeof entry?.sourceId !== "string"
    || safeCount(entry.recordCount) === null
    || typeof entry.checksumSha256 !== "string"
    || !/^[a-f0-9]{64}$/i.test(entry.checksumSha256));
  if (hasInvalidSource) return null;
  const sourceCount = manifest.sources.reduce((sum, entry) => sum + entry.recordCount, 0);
  return sourceCount === recordCount ? recordCount : null;
}

/**
 * Resolves the count shown by the quality summary from the latest generated
 * health snapshot while keeping the configured historical reference visible.
 * A changed count is not silently treated as a coverage percentage: it is
 * marked as a scope mismatch until the two denominators are reconciled.
 */
export function reconcileSourceCounts({ source, healthEntry, catalogEntry, transferRows = null, r2ReleaseCount = null }) {
  const configuredCanonicalCount = safeCount(source.canonicalCount);
  const configuredHistoricalCount = safeCount(source.historicalCount);
  const observedCount = safeCount(healthEntry?.recordCount);
  const catalogCount = safeCount(catalogEntry?.recordCount);
  const publishedTransferRows = safeCount(transferRows);
  const publishedCpltRows = source.id === "transparencia-activa" ? safeCount(r2ReleaseCount) : null;
  const isTransferRelease = source.id === "ley-19862" && publishedTransferRows !== null;
  const isCpltRelease = publishedCpltRows !== null;
  const canonicalCount = isCpltRelease
    ? publishedCpltRows
    : isTransferRelease
      ? publishedTransferRows
    : observedCount ?? configuredCanonicalCount ?? 0;
  const historicalCount = isCpltRelease
    ? configuredHistoricalCount ?? canonicalCount
    : isTransferRelease
      ? publishedTransferRows
    : configuredHistoricalCount ?? canonicalCount;
  const scopeMismatch = !isTransferRelease && !isCpltRelease
    && ((observedCount !== null
      && configuredCanonicalCount !== null
      && observedCount !== configuredCanonicalCount)
      || (catalogCount !== null && configuredCanonicalCount !== null && catalogCount !== configuredCanonicalCount));
  const comparisonEligible = isTransferRelease || (!isCpltRelease && observedCount !== null && !scopeMismatch);
  const state = isTransferRelease || isCpltRelease
    ? "release_override"
    : observedCount === null
      ? "configured_only"
      : scopeMismatch
        ? "scope_mismatch"
        : "aligned";
  const queryableCount = isCpltRelease
    ? publishedCpltRows
    : isTransferRelease
      ? publishedTransferRows
    : source.queryableCount === null || source.queryableCount === undefined
      ? null
      : observedCount ?? source.queryableCount;
  const rawComponents = healthEntry?.components && typeof healthEntry.components === "object"
    ? Object.entries(healthEntry.components)
      .map(([key, value]) => [key, safeCount(value)]).filter(([, value]) => value !== null)
    : [];
  const components = rawComponents.length > 0 ? Object.fromEntries(rawComponents) : null;
  const note = state === "scope_mismatch"
    ? `Los conteos no coinciden: observado ${observedCount?.toLocaleString("es-CL") ?? "sin dato"}, catálogo ${catalogCount?.toLocaleString("es-CL") ?? "sin dato"} y referencia ${configuredCanonicalCount?.toLocaleString("es-CL") ?? "sin dato"}. No se calcula cobertura hasta reconciliar el alcance.`
    : state === "configured_only"
      ? "No hay un snapshot de salud asociado a este build; se conserva la referencia configurada y no se infiere cobertura vigente."
      : state === "release_override"
        ? isCpltRelease
          ? `El sitio permite consultar ${publishedCpltRows.toLocaleString("es-CL")} registros publicados. La cobertura total de la fuente no está medida.`
          : "El conteo proviene del release vigente validado para esta fuente."
        : "El conteo observado coincide con la referencia configurada para este alcance.";

  return {
    canonicalCount,
    historicalCount,
    queryableCount,
    reconciliation: {
      state,
      comparisonEligible,
      configuredCanonicalCount,
      configuredHistoricalCount,
      observedCount,
      catalogCount,
      components,
      note,
    },
  };
}
