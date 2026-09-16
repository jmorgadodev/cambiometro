const STATIC_TO_PRODUCTION = Object.freeze({
  "transparencia-activa": "cplt",
});

function integer(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sourceRow(source) {
  return {
    id: String(source?.id ?? ""),
    label: source?.label ?? null,
    publishedRows: integer(source?.publishedCount),
    queryableRows: integer(source?.queryableCount),
    status: source?.status ?? null,
    period: source?.period ?? null,
    sourceType: source?.sourceType ?? null,
  };
}

function productionRow(source) {
  return {
    id: String(source?.id ?? ""),
    label: source?.label ?? null,
    rows: integer(source?.recordCount ?? source?.queryableCount),
    queryableRows: integer(source?.queryableCount ?? source?.recordCount),
    status: source?.status ?? null,
    updatedAt: source?.lastUpdated ?? source?.generatedAt ?? null,
  };
}

function scopeRow(id, response) {
  const meta = response?.meta ?? {};
  return {
    id,
    rows: integer(meta.total) ?? 0,
    updatedAt: meta.updatedAt ?? null,
    qualityIssues: integer(meta.calidadDatos?.registrosConIncidencias) ?? 0,
    sourceStatus: meta.sourceStatus ?? null,
    quality: meta.calidadDatos ?? null,
  };
}

function compareStaticToProduction(staticSource, productionById) {
  const productionId = STATIC_TO_PRODUCTION[staticSource.id];
  if (!productionId) return null;
  const production = productionById.get(productionId);
  if (!production || staticSource.publishedRows === null || production.rows === null) return null;
  const delta = production.rows - staticSource.publishedRows;
  if (delta === 0) return null;
  return {
    code: "STATIC_VS_PRODUCTION_COUNT_MISMATCH",
    sourceId: staticSource.id,
    productionId,
    staticRows: staticSource.publishedRows,
    productionRows: production.rows,
    delta,
    severity: "review",
    reason: "Los conteos pertenecen a releases o alcances diferentes hasta que se reconcilien por período y organismo.",
  };
}

export function buildRemunerationAudit({
  generatedAt = new Date().toISOString(),
  unifiedManifest = {},
  productionSources = [],
  scopeResponses = {},
  probes = [],
} = {}) {
  const staticSources = Array.isArray(unifiedManifest.sources) ? unifiedManifest.sources.map(sourceRow) : [];
  const production = productionSources.map(productionRow);
  const productionById = new Map(production.map((source) => [source.id, source]));
  const findings = staticSources
    .map((source) => compareStaticToProduction(source, productionById))
    .filter(Boolean);

  const scopes = ["municipal", "central"]
    .filter((id) => scopeResponses[id])
    .map((id) => scopeRow(id, scopeResponses[id]));
  const probeRows = probes.map((probe) => {
    const total = integer(probe.total) ?? 0;
    return {
      label: String(probe.label ?? ""),
      scope: String(probe.scope ?? "all"),
      total,
      returned: integer(probe.returned) ?? null,
      status: total > 0 ? "pass" : "fail",
    };
  });
  for (const probe of probeRows) {
    if (probe.status === "fail") findings.push({
      code: "PROBE_NO_RESULTS",
      label: probe.label,
      scope: probe.scope,
      severity: "review",
      reason: "La consulta acotada no encontró filas; no modifica ni invalida el release.",
    });
  }

  return {
    schemaVersion: 1,
    generatedAt,
    releaseMutation: "none",
    staticRelease: {
      generatedAt: unifiedManifest.generatedAt ?? null,
      totalRows: integer(unifiedManifest.totalRows) ?? 0,
      pageCount: integer(unifiedManifest.pageCount) ?? 0,
      pageSize: integer(unifiedManifest.pageSize) ?? null,
      sources: staticSources,
    },
    productionSources: production,
    scopes,
    probes: probeRows,
    findings,
    policy: {
      reads: "manifiestos y consultas limitadas",
      massD1Reads: false,
      releaseWrites: false,
      originalValuesPreserved: true,
      countInterpretation: "Los conteos se comparan por alcance; no se suman universos de releases distintos.",
    },
  };
}
