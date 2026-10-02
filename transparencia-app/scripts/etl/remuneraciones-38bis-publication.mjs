export function shouldVerify38BisPublication(jobs) {
  const steps = jobs.flatMap((job) => job.steps ?? [])
    .filter((step) => step.name === "Publicar snapshot, manifest y auditoría en R2");
  if (steps.length !== 1) throw new Error("38BIS_PUBLICATION_RESULT_MISSING");
  if (!["success", "skipped"].includes(steps[0].conclusion)) throw new Error("38BIS_PUBLICATION_RESULT_INVALID");
  return steps[0].conclusion === "success";
}
