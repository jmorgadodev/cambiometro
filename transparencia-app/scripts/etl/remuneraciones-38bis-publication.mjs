import { validate38BisSnapshot, validate38BisHistory } from "./remuneraciones-38bis-parser.mjs";

export function validate38BisArtifacts(current, history, audit) {
  validate38BisSnapshot(current);
  validate38BisHistory(history);
  if (audit?.source_id !== "remuneraciones-38bis" || audit.mes !== current.mes
    || audit.filas !== current.filas || audit.checksum_sha256 !== current.checksum_sha256
    || audit.d1_rows_read !== 0 || audit.d1_rows_written !== 0) throw new Error("38BIS_AUDIT_INVALID");
  return { rows: current.filas, mes: current.mes, checksum: current.checksum_sha256, historyPeriods: history.periodos.length };
}

export function shouldVerify38BisPublication(jobs) {
  const steps = jobs.flatMap((job) => job.steps ?? [])
    .filter((step) => step.name === "Publicar snapshot, manifest y auditoría en R2");
  if (steps.length !== 1) throw new Error("38BIS_PUBLICATION_RESULT_MISSING");
  if (!["success", "skipped"].includes(steps[0].conclusion)) throw new Error("38BIS_PUBLICATION_RESULT_INVALID");
  return steps[0].conclusion === "success";
}
