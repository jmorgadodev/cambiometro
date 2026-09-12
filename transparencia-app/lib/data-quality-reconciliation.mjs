const safeCount = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;

/**
 * Resolves the count shown by the quality summary from the latest generated
 * health snapshot while keeping the configured historical reference visible.
 * A changed count is not silently treated as a coverage percentage: it is
 * marked as a scope mismatch until the two denominators are reconciled.
 */
export function reconcileSourceCounts({ source, healthEntry, catalogEntry, transferRows = null }) {
  const configuredCanonicalCount = safeCount(source.canonicalCount);
  const configuredHistoricalCount = safeCount(source.historicalCount);
  const observedCount = safeCount(healthEntry?.recordCount);
  const publishedTransferRows = safeCount(transferRows);
  const isTransferRelease = source.id === "ley-19862" && publishedTransferRows !== null;
  const canonicalCount = isTransferRelease
    ? publishedTransferRows
    : observedCount ?? configuredCanonicalCount ?? 0;
  const historicalCount = isTransferRelease
    ? publishedTransferRows
    : configuredHistoricalCount ?? canonicalCount;
  const scopeMismatch = !isTransferRelease
    && observedCount !== null
    && configuredCanonicalCount !== null
    && observedCount !== configuredCanonicalCount;
  const comparisonEligible = isTransferRelease || (observedCount !== null && !scopeMismatch);
  const state = isTransferRelease
    ? "release_override"
    : observedCount === null
      ? "configured_only"
      : scopeMismatch
        ? "scope_mismatch"
        : "aligned";
  const queryableCount = source.queryableCount === null || source.queryableCount === undefined
    ? null
    : isTransferRelease
      ? publishedTransferRows
      : observedCount ?? source.queryableCount;
  const components = healthEntry?.components && typeof healthEntry.components === "object"
    ? healthEntry.components
    : null;
  const note = state === "scope_mismatch"
    ? `El release observado informa ${observedCount.toLocaleString("es-CL")} registros; la referencia histórica declarada es ${configuredCanonicalCount.toLocaleString("es-CL")}. No se calcula cobertura hasta reconciliar el alcance.`
    : state === "configured_only"
      ? "No hay un snapshot de salud asociado a este build; se conserva la referencia configurada y no se infiere cobertura vigente."
      : state === "release_override"
        ? "El conteo proviene del release vigente validado para esta fuente."
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
      catalogCount: safeCount(catalogEntry?.recordCount),
      components,
      note,
    },
  };
}
