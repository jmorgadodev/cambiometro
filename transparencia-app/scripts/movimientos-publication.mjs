import { assertReleaseCandidate } from "./etl/release-candidate.mjs";
import { sha256, validateMovementPayload } from "./movimientos-pipeline.mjs";

export function assertMovementCandidate(previous, candidate) {
  validateMovementPayload(candidate);
  assertReleaseCandidate({
    sourceId: candidate.pipeline, expectedSourceId: "etl_movimientos_autoridades",
    complete: true, records: candidate.movimientos, recordCount: candidate.movimientos.length,
    periods: candidate.movimientos.map((row) => row.fecha),
    checksumSha256: candidate.checksum_sha256,
    actualChecksumSha256: sha256({ ...candidate, checksum_sha256: undefined }),
    previous: { recordCount: previous.movimientos.length, checksumSha256: previous.checksum_sha256 },
  });
  return candidate;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort()
    .filter((key) => key !== "last_seen_at")
    .map((key) => [key, canonical(value[key])]));
}

export function hasMovementPublicChanges(previous, candidate) {
  const evidence = (payload) => JSON.stringify({
    movimientos: (payload.movimientos ?? []).map((row) => JSON.stringify(canonical(row))).sort(),
    signals: (payload.signals ?? []).map((row) => JSON.stringify(canonical(row))).sort(),
  });
  return evidence(previous) !== evidence(candidate);
}

export function shouldRefreshMovements(jobs) {
  const steps = jobs.flatMap((job) => job.steps ?? [])
    .filter((step) => step.name === "Validar snapshot y publicar grupo estático");
  if (steps.length !== 1) throw new Error("MOVIMIENTOS_PUBLICATION_RESULT_MISSING");
  if (!["success", "skipped"].includes(steps[0].conclusion)) throw new Error("MOVIMIENTOS_PUBLICATION_RESULT_INVALID");
  return steps[0].conclusion === "success";
}
