export interface SourceStateRow {
  source_id: string;
  status: string;
  record_count: number;
  generated_at: string | null;
  last_success_at: string | null;
  error: string | null;
  published_version: string | null;
}

export interface SourceCountRow {
  source_id: string;
  count: number;
}

export interface EtlRunRow {
  id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
}

// `senado` contiene dietas, pasajes y gastos mensuales. La nómina vigente se
// actualiza por separado al materializar mandatos, por lo que exigir frescura
// diaria a esta fuente financiera produce un 503 engañoso.
const DAILY = new Set(["camara", "votaciones_camara", "votaciones_senado", "asistencia_camara"]);
const WEEKLY = new Set(["infoprobidad", "infolobby", "personal-apoyo"]);
// Esta proyeccion se consulta desde KV y se respalda en R2. No corresponde
// duplicar sus filas en la tabla canonica `records` solo para aprobar salud.
const PROJECTION_ONLY = new Set(["personal-apoyo"]);

function freshnessHours(sourceId: string) {
  if (DAILY.has(sourceId)) return 36;
  if (WEEKLY.has(sourceId)) return 9 * 24;
  return 40 * 24;
}

export function evaluateDataHealth({
  states,
  counts,
  latestRun,
  now = new Date(),
}: {
  states: SourceStateRow[];
  counts: SourceCountRow[];
  latestRun: EtlRunRow | null;
  now?: Date;
}) {
  const actualBySource = new Map(counts.map((row) => [row.source_id, Number(row.count)]));
  const sources = states.map((state) => {
    const actualRecordCount = actualBySource.get(state.source_id) ?? 0;
    const updatedAt = state.last_success_at ?? state.generated_at;
    const updatedMillis = updatedAt ? Date.parse(updatedAt) : Number.NaN;
    const ageHours = Number.isFinite(updatedMillis) ? Math.max(0, (now.getTime() - updatedMillis) / 3_600_000) : null;
    const stale = ageHours === null || ageHours > freshnessHours(state.source_id);
    const archiveOnly = state.status === "archive_only";
    const projectionOnly = PROJECTION_ONLY.has(state.source_id);
    const parity = archiveOnly || projectionOnly || actualRecordCount === Number(state.record_count);
    return {
      id: state.source_id,
      status: state.status,
      manifestRecordCount: Number(state.record_count),
      actualRecordCount,
      parity,
      stale,
      ageHours: ageHours === null ? null : Math.round(ageHours * 10) / 10,
      updatedAt,
      publishedVersion: state.published_version,
      error: state.error,
      archiveOnly,
      projectionOnly,
    };
  });
  const runHealthy = latestRun?.status === "success";
  const sourcesHealthy = sources.length > 0 && sources.every((source) => source.parity && !source.stale && !source.error && (source.actualRecordCount > 0 || source.archiveOnly || (source.projectionOnly && source.manifestRecordCount > 0)));
  return {
    healthy: Boolean(runHealthy && sourcesHealthy),
    latestRun,
    sources,
    summary: {
      total: sources.length,
      stale: sources.filter((source) => source.stale).length,
      parityFailures: sources.filter((source) => !source.parity).length,
      errors: sources.filter((source) => source.error).length,
      emptySources: sources.filter((source) => source.actualRecordCount === 0 && !source.archiveOnly && !source.projectionOnly).length,
    },
  };
}

export function publicDataHealth(health: ReturnType<typeof evaluateDataHealth>) {
  return {
    healthy: health.healthy,
    latestRun: health.latestRun
      ? {
          status: health.latestRun.status,
          startedAt: health.latestRun.started_at,
          finishedAt: health.latestRun.finished_at,
        }
      : null,
    sources: health.sources.map((source) => ({
      id: source.id,
      status: source.status,
      manifestRecordCount: source.manifestRecordCount,
      actualRecordCount: source.actualRecordCount,
      parity: source.parity,
      stale: source.stale,
      ageHours: source.ageHours,
      updatedAt: source.updatedAt,
      hasError: Boolean(source.error),
      archiveOnly: source.archiveOnly,
      projectionOnly: source.projectionOnly,
    })),
    summary: health.summary,
  };
}
