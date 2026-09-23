const RECONCILED_RELEASE_ID = "kast-2026-succession-reconciled-2026-09-14";
const RECONCILED_RELEASE_SIZE = 46;
const LEGACY_MINIMUM_SIZE = 79;
const FRESHNESS_TOLERANCE_MS = 5 * 60_000;

export function validateMovementFreshness(payload, manifest, etlCompletedAt) {
  const movements = payload?.movimientos;
  const dataset = manifest?.datasets?.movimientos;
  const isReconciledRelease = payload?.release_id === RECONCILED_RELEASE_ID
    && payload?.release_status === "published_reconciled"
    && Array.isArray(movements)
    && movements.length === RECONCILED_RELEASE_SIZE;

  if (!Array.isArray(movements) || movements.length < (isReconciledRelease ? RECONCILED_RELEASE_SIZE : LEGACY_MINIMUM_SIZE)) {
    throw new Error("MOVIMIENTOS_UNIVERSE_INCOMPLETE");
  }
  if (!/^[a-f0-9]{64}$/i.test(payload?.checksum_sha256 ?? "")) {
    throw new Error("MOVIMIENTOS_CHECKSUM_MISSING");
  }
  if (!Number.isInteger(dataset?.count) || dataset.count !== movements.length) {
    throw new Error("MOVIMIENTOS_MANIFEST_COUNT_MISMATCH");
  }
  if (dataset.pipelineChecksumSha256 !== payload.checksum_sha256) {
    throw new Error("MOVIMIENTOS_MANIFEST_CHECKSUM_MISMATCH");
  }

  const lastSuccess = Date.parse(payload.last_success_at || payload.last_run || "");
  if (!Number.isFinite(lastSuccess)) throw new Error("MOVIMIENTOS_LAST_SUCCESS_MISSING");

  const completedAt = Number.isFinite(etlCompletedAt) ? etlCompletedAt : Date.parse(etlCompletedAt || "");
  if (Number.isFinite(completedAt)) {
    const publishedAt = Date.parse(manifest.generatedAt || "");
    if (!Number.isFinite(publishedAt) || publishedAt + FRESHNESS_TOLERANCE_MS < completedAt) {
      throw new Error("MOVIMIENTOS_RELEASE_NOT_REFRESHED_AFTER_ETL");
    }
    // This reconciled release is a fixed historical cutoff. Its last_success_at
    // describes the cutoff data, not the time its R2/Pages snapshot was republished.
    if (!isReconciledRelease && lastSuccess + FRESHNESS_TOLERANCE_MS < completedAt) {
      throw new Error("MOVIMIENTOS_RELEASE_NOT_REFRESHED_AFTER_ETL");
    }
  }

  return {
    total: movements.length,
    lastSuccess: new Date(lastSuccess).toISOString(),
    checksum: payload.checksum_sha256,
  };
}

export function hasOfficialMovementEvidence(payload) {
  const hasDocumentedMovement = payload?.movimientos?.some((movement) =>
    movement.fuentes?.some((source) => source.nivel === "oficial"),
  );
  const hasOfficialSignal = payload?.signals?.some((signal) => signal.source_tier === "official");
  return Boolean(hasDocumentedMovement || hasOfficialSignal);
}
