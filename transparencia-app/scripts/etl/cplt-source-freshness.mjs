export const CPLT_SOURCES = [
  { sourceId: "cplt-personal-planta", fileName: "TA_PersonalPlanta.csv" },
  { sourceId: "cplt-personal-contrata", fileName: "TA_PersonalContrata.csv" },
  { sourceId: "cplt-personal-honorarios", fileName: "TA_PersonalContratohonorarios.csv" },
  { sourceId: "cplt-personal-codigotrabajo", fileName: "TA_PersonalCodigotrabajo.csv" },
];

export const CPLT_SOURCE_BASES = [
  "https://consejotransparencia.cl/transparencia_activa/datoabierto/archivos",
  "https://www.cplt.cl/transparencia_activa/datoabierto/archivos",
];

export function sourceUrls(source) {
  return CPLT_SOURCE_BASES.map((base) => `${base}/${source.fileName}`);
}

export function currentSourceValidator(response) {
  return response.headers.get("etag") || response.headers.get("last-modified") || null;
}

export function compareCpltSourceValidators(previousSources, currentSources) {
  // The municipal writer now includes its scope; retain legacy checker IDs.
  // Never alias a central payroll into the municipal manifest.
  const sourceKey = (id) => String(id ?? "").replace(/^cplt-personal-municipal-/, "cplt-personal-");
  const previousById = new Map();
  for (const source of previousSources ?? []) {
    const key = sourceKey(source.sourceId);
    const existing = previousById.get(key);
    if (existing && existing.sourceValidator !== source.sourceValidator) throw new Error(`CPLT_FRESHNESS_SOURCE_AMBIGUOUS:${key}`);
    previousById.set(key, source);
  }
  return currentSources.map((source) => {
    const previous = previousById.get(sourceKey(source.sourceId));
    return {
      sourceId: source.sourceId,
      validator: source.validator,
      previousValidator: previous?.sourceValidator ?? null,
      changed: !previous || !previous.sourceValidator || previous.sourceValidator !== source.validator,
    };
  });
}

export function shouldVerifyCpltPublication(jobs) {
  const finalizers = jobs.filter((job) => job.name === "Consolidación y Publicación R2");
  if (finalizers.length !== 1 || !["success", "skipped"].includes(finalizers[0].conclusion)) {
    throw new Error("CPLT_PUBLICATION_RESULT_INVALID");
  }
  if (finalizers[0].conclusion === "skipped") return false;
  const steps = (finalizers[0].steps ?? []).filter((step) => step.name === "Publicar agregados municipales para Pages");
  if (steps.length !== 1 || steps[0].conclusion !== "success") throw new Error("CPLT_PUBLICATION_RESULT_INVALID");
  return true;
}

// Recovery consumes only artifacts from the canonical producer, never fork/PR code.
export function validateCpltResume(run, jobs, artifacts, repository) {
  if (!Number.isSafeInteger(run?.id) || run.id < 1 || run.status !== "completed"
    || !["failure", "cancelled"].includes(run.conclusion)
    || run.path !== ".github/workflows/etl-cplt.yml" || run.head_branch !== "main"
    || !["schedule", "workflow_dispatch"].includes(run.event)
    || run.head_repository?.full_name !== repository) {
    throw new Error("CPLT_RESUME_PRODUCER_INVALID");
  }
  for (const category of ["Planta", "Contrata", "Honorarios", "CodigoTrabajo"]) {
    const matches = jobs.filter(job => job.name === `Ingesta Nóminas CPLT (${category})`);
    if (matches.length !== 1 || matches[0].conclusion !== "success") {
      throw new Error(`CPLT_RESUME_CATEGORY_INVALID:${category}`);
    }
    const files = artifacts.filter(artifact => artifact.name === `cplt-${category}`);
    if (files.length !== 1 || files[0].expired !== false) {
      throw new Error(`CPLT_RESUME_ARTIFACT_INVALID:${category}`);
    }
  }
  if (artifacts.filter(artifact => artifact.name.startsWith("cplt-")).length !== 4) {
    throw new Error("CPLT_RESUME_ARTIFACT_INVALID:unexpected-category");
  }
  return run.id;
}

export function validateCpltResumeBaseline(run, manifest) {
  const publishedAt = Date.parse(manifest?.generatedAt);
  const startedAt = Date.parse(run?.created_at);
  if (manifest?.sourceId !== "transparencia-activa" || !manifest.version
    || !Number.isFinite(publishedAt) || !Number.isFinite(startedAt) || publishedAt > startedAt) {
    throw new Error("CPLT_RESUME_BASELINE_INVALID");
  }
}
