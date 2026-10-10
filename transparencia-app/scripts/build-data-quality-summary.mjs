import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cpltR2ReleaseCount, reconcileSourceCounts, summarizeSourcePartitions } from "../lib/data-quality-reconciliation.mjs";

const root = process.cwd();
const readJson = (relative, fallback) => {
  try {
    return JSON.parse(readFileSync(join(root, relative), "utf8"));
  } catch {
    return fallback;
  }
};

const config = readJson("data/data-quality-sources.json", []);
if (!Array.isArray(config) || config.length !== 13) {
  throw new Error("DATA_QUALITY_CONFIG_INVALID");
}

const health = readJson("data/etl/source-health.json", { generatedAt: null, sources: {} });
const catalog = readJson("data/lake/catalog/v1/manifest.json", { generatedAt: null, sources: [] });
const globalKpis = readJson("lib/global-kpis.json", { registros_canonicos: null, relaciones: null });
const transferRelease = readJson("data/generated/transferencias/summary.json", null);
const cpltR2Manifest = readJson(".ci-data-version/funcionarios-manifest.json",
  readJson(".ci-data-version/cplt-current-r2-manifest.json", null));
const cpltReleaseCount = cpltR2ReleaseCount(cpltR2Manifest);
const transferRows = Number.isSafeInteger(transferRelease?.totalRows)
  ? transferRelease.totalRows
  : Number.isSafeInteger(transferRelease?.sourceRows)
    ? transferRelease.sourceRows
    : Number.isSafeInteger(transferRelease?.kpis?.total_transfers)
      ? transferRelease.kpis.total_transfers
      : null;
const catalogById = new Map((catalog.sources ?? []).map((source) => [source.id, source]));
const catalogSourceAliases = {
  "transparencia-activa": "cplt",
  "ley-19862": "ley19862",
};
const dipresCatalogEntry = catalogById.get("dipres") ?? null;
const dipresDeclaredCount = Number.isSafeInteger(dipresCatalogEntry?.recordCount) ? dipresCatalogEntry.recordCount : null;
const dipresPartitions = summarizeSourcePartitions(catalog.partitions, "dipres", dipresDeclaredCount);
const publishedPartitionCounts = new Map();
for (const partition of Array.isArray(catalog.partitions) ? catalog.partitions : []) {
  const sourceId = String(partition?.sourceId ?? "");
  const recordCount = Number(partition?.recordCount);
  if (!sourceId || !Number.isSafeInteger(recordCount) || recordCount < 0) continue;
  publishedPartitionCounts.set(sourceId, (publishedPartitionCounts.get(sourceId) ?? 0) + recordCount);
}
const healthAliases = {
  "transparencia-activa": "cplt",
  "ley-19862": "ley19862",
  "ine-censo-2024": "ine",
};

const metric = (count, denominator) => {
  const valid = Number.isFinite(count) && Number.isFinite(denominator) && denominator > 0;
  const percent = valid ? Math.round((count / denominator) * 1000) / 10 : null;
  return {
    count: valid ? count : null,
    denominator: valid ? denominator : null,
    percent,
    label: percent === null ? "No calculable" : `${percent.toLocaleString("es-CL", { maximumFractionDigits: 1 })}%`,
  };
};

const sources = config.map((source) => {
  const healthKey = healthAliases[source.id] ?? source.id;
  const healthEntry = health.sources?.[healthKey] ?? null;
  const catalogEntry = catalogById.get(source.id) ?? null;
  const catalogSourceId = catalogSourceAliases[source.id] ?? source.id;
  const partitionCount = publishedPartitionCounts.get(catalogSourceId);
  const resolvedCounts = reconcileSourceCounts({
    source,
    healthEntry,
    catalogEntry,
    transferRows,
    r2ReleaseCount: source.id === "transparencia-activa" ? cpltReleaseCount : null,
  });
  const isDipresCatalog = source.id === "dipres" && catalogEntry !== null;
  const isDipresRelease = isDipresCatalog && dipresPartitions !== null;
  const canonicalCount = isDipresCatalog ? dipresPartitions?.latestRows ?? source.canonicalCount : resolvedCounts.canonicalCount;
  const historicalCount = isDipresCatalog ? dipresPartitions?.totalRows ?? dipresDeclaredCount ?? source.historicalCount : resolvedCounts.historicalCount;
  const queryableCount = resolvedCounts.queryableCount;
  const reconciliation = isDipresCatalog && !dipresPartitions
    ? {
      ...resolvedCounts.reconciliation,
      state: "scope_mismatch",
      comparisonEligible: false,
      note: `No se publica el corte DIPRES: el catálogo declara ${dipresDeclaredCount?.toLocaleString("es-CL") ?? "un conteo inválido"}, pero sus particiones no suman ese total o están incompletas.`,
    }
    : isDipresRelease
    ? {
      ...resolvedCounts.reconciliation,
      note: `DIPRES: ${dipresPartitions.latestRows.toLocaleString("es-CL")} observaciones en ${dipresPartitions.latestPeriod}; el catálogo suma ${dipresPartitions.totalRows.toLocaleString("es-CL")} observaciones en ${dipresPartitions.availablePeriods} cortes disponibles. Son registros presupuestarios agregados, no personas; la cobertura total no está medida.`,
    }
    : resolvedCounts.reconciliation;
  const configuredPublicHistoricalCount = Number.isSafeInteger(source.publicHistoricalCount)
    ? source.publicHistoricalCount
    : null;
  const catalogMatchesConfigured = Number.isSafeInteger(catalogEntry?.recordCount)
    && catalogEntry.recordCount === source.canonicalCount;
  const publicHistoricalCount = isDipresCatalog
    ? dipresPartitions?.latestRows ?? null
    : isDipresRelease
    ? dipresPartitions.latestRows
    : configuredPublicHistoricalCount !== null
    ? configuredPublicHistoricalCount
    : reconciliation.state === "release_override" && source.id === "transparencia-activa"
      ? canonicalCount
    : catalogMatchesConfigured
      ? source.canonicalCount
      : reconciliation.comparisonEligible && Number.isSafeInteger(partitionCount) && partitionCount > 0
        ? Math.max(canonicalCount, partitionCount)
        : reconciliation.comparisonEligible
          ? canonicalCount
          : null;
  const lastSuccessAt = healthEntry?.lastSuccessAt ?? healthEntry?.last_success_at ?? catalogEntry?.lastSuccessAt ?? null;
  const releaseGeneratedAt = source.id === "transparencia-activa" && cpltReleaseCount !== null
    ? cpltR2Manifest.generatedAt ?? null
    : healthEntry?.updatedAtKind === "release"
    ? healthEntry.generatedAt ?? null
    : catalogEntry?.updatedAtKind === "release"
      ? catalogEntry.generatedAt ?? null
      : source.id === "ley-19862"
        ? transferRelease?.generatedAt ?? null
        : null;
  const lastUpdatedAt = reconciliation.state === "release_override" && source.id === "transparencia-activa"
    ? releaseGeneratedAt
    : lastSuccessAt ?? releaseGeneratedAt;
  const lastUpdatedKind = reconciliation.state === "release_override" && source.id === "transparencia-activa"
    ? "release"
    : lastSuccessAt ? "source-success" : releaseGeneratedAt ? "release" : "unknown";
  const sourceStatus = healthEntry?.status ?? catalogEntry?.status ?? null;
  const status = canonicalCount <= 0
    ? "no_disponible"
    : sourceStatus === "stale"
      ? "desfasado"
      : sourceStatus === "connected" || sourceStatus === "complete"
        ? "completo"
        : "parcial";
  const period = isDipresCatalog && !dipresPartitions
    ? "Cortes DIPRES no conciliados"
    : isDipresRelease
    ? dipresPartitions.periodLabel
    : source.id === "transparencia-activa" && reconciliation.state === "release_override"
    ? "Período por confirmar"
    : Array.isArray(catalogEntry?.foundPeriods) && catalogEntry.foundPeriods.length
    ? catalogEntry.foundPeriods[catalogEntry.foundPeriods.length - 1]
    : source.period;
  const checksumSha256 = catalogEntry?.indexChecksumSha256 ?? null;
  return {
    ...source,
    canonicalCount,
    historicalCount,
    catalogDeclaredCount: isDipresCatalog
      ? dipresDeclaredCount
      : Number.isSafeInteger(source.catalogDeclaredCount) ? source.catalogDeclaredCount : null,
    publicHistoricalCount,
    period,
    lastSuccessAt,
    lastUpdatedAt,
    lastUpdatedKind,
    checksumSha256,
    status,
    statusDetail: status === "completo"
      ? "Release validado y disponible para consulta."
      : status === "desfasado"
        ? "Existe un release, pero su fecha de publicación requiere actualización."
        : status === "no_disponible"
          ? "No existe un release consultable en este corte."
          : "Release disponible; la completitud se mantiene separada de la disponibilidad.",
    metrics: {
      published: metric(canonicalCount, historicalCount),
      queryable: reconciliation.comparisonEligible ? metric(queryableCount, canonicalCount) : metric(null, null),
      related: metric(source.relatedCount, canonicalCount),
    },
    quality: source.qualityObservations,
    reconciliation,
  };
});

for (const source of sources) {
  if (!source.reconciliation.comparisonEligible) {
    source.metrics.published = metric(null, null);
    source.metrics.queryable = metric(null, null);
    source.statusDetail = source.reconciliation.note;
  }
}

const allSourceCountsReconciled = sources.every((source) => source.reconciliation.comparisonEligible);
const totalCanonicalRecords = allSourceCountsReconciled
  ? sources.reduce((sum, source) => sum + source.canonicalCount, 0)
  : null;
const totalHistoricalRecords = allSourceCountsReconciled
  ? sources.reduce((sum, source) => sum + source.historicalCount, 0)
  : null;
const queryableSources = sources.filter((source) => source.reconciliation.comparisonEligible && source.metrics.queryable.count !== null);
const queryableCount = allSourceCountsReconciled && queryableSources.length
  ? queryableSources.reduce((sum, source) => sum + source.metrics.queryable.count, 0)
  : null;
const queryableDenominator = allSourceCountsReconciled && queryableSources.length
  ? queryableSources.reduce((sum, source) => sum + source.canonicalCount, 0)
  : null;
const totalRelatedRecords = Number.isSafeInteger(globalKpis.relaciones) ? globalKpis.relaciones : null;
const generatedAt = health.generatedAt ?? catalog.generatedAt ?? globalKpis.generatedAt ?? new Date().toISOString();
const payload = {
  schemaVersion: 1,
  generatedAt,
  sourceCount: sources.length,
  totalCanonicalRecords,
  totalHistoricalRecords,
  totalRelatedRecords,
  globalKpiRecords: Number.isSafeInteger(globalKpis.registros_canonicos) ? globalKpis.registros_canonicos : null,
  note: "Los totales por fuente no son aditivos cuando un registro participa en más de un módulo; el KPI global conserva el corte canónico de la plataforma.",
  metrics: {
    published: sources.every((source) => source.reconciliation.comparisonEligible)
      ? metric(totalCanonicalRecords, totalHistoricalRecords)
      : metric(null, null),
    queryable: metric(queryableCount, queryableDenominator),
    related: metric(totalRelatedRecords, totalCanonicalRecords),
  },
  sources,
};
const content = `${JSON.stringify(payload, null, 2)}\n`;
const checksum = createHash("sha256").update(content).digest("hex");
payload.manifestChecksumSha256 = checksum;
const finalContent = `${JSON.stringify(payload, null, 2)}\n`;

await mkdir(join(root, "data", "generated"), { recursive: true });
await mkdir(join(root, "public", "data"), { recursive: true });
await writeFile(join(root, "data", "generated", "data-quality-summary.json"), finalContent);
await writeFile(join(root, "public", "data", "data-quality-summary.json"), finalContent);
console.log(JSON.stringify({
  status: "generated",
  sourceCount: sources.length,
  totalCanonicalRecords,
  totalQueryableRecords: queryableCount,
  totalRelatedRecords,
  checksumSha256: checksum,
}, null, 2));
