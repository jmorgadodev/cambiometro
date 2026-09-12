import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sourceConfig from "@/data/data-quality-sources.json";
import { getTransferReleaseMetadata } from "@/lib/transfer-release-metadata";

export type DataQualityStatus = "completo" | "parcial" | "desfasado" | "no_disponible";
export type ConfidenceLevel = "official" | "semi-official" | "provisional" | "derived";

export interface CoverageMetric {
  count: number | null;
  denominator: number | null;
  percent: number | null;
  label: string;
}

export interface QualityAuditObservation {
  label: string;
  count: number;
  percent: number;
  action: string;
}

export interface QualityAuditSnapshot {
  snapshotDate: string;
  snapshotRecords: number;
  evidencePath: string;
  status: "snapshot-not-current-release" | "current-release";
  note: string;
  observations: QualityAuditObservation[];
}

export type SourceReconciliationState = "aligned" | "scope_mismatch" | "configured_only" | "release_override";

export interface SourceCountReconciliation {
  state: SourceReconciliationState;
  comparisonEligible: boolean;
  configuredCanonicalCount: number | null;
  configuredHistoricalCount: number | null;
  observedCount: number | null;
  catalogCount: number | null;
  components: Record<string, number> | null;
  note: string;
}

export interface DataQualitySourceSummary {
  id: string;
  label: string;
  organization: string;
  officialUrl: string;
  scope: string;
  confidenceLevel: ConfidenceLevel;
  frequency: string;
  period: string;
  lag: string;
  coverageDetail: string;
  coverageNote: string;
  canonicalCount: number;
  historicalCount: number;
  lastSuccessAt: string | null;
  checksumSha256: string | null;
  status: DataQualityStatus;
  statusDetail: string;
  modulePath: string;
  derived: boolean;
  metrics: {
    published: CoverageMetric;
    queryable: CoverageMetric;
    related: CoverageMetric;
  };
  quality: {
    observedCount: number;
    correctedCount: number;
  };
  reconciliation: SourceCountReconciliation;
  qualityAudit?: QualityAuditSnapshot;
}

export interface DataQualitySummary {
  schemaVersion: 1;
  generatedAt: string;
  sourceCount: number;
  totalCanonicalRecords: number;
  totalHistoricalRecords: number;
  totalRelatedRecords: number | null;
  globalKpiRecords?: number | null;
  manifestChecksumSha256?: string;
  metrics: {
    published: CoverageMetric;
    queryable: CoverageMetric;
    related: CoverageMetric;
  };
  sources: DataQualitySourceSummary[];
}

type SourceConfig = (typeof sourceConfig)[number];

type JsonObject = Record<string, unknown>;

const safeCount = (value: unknown): number | null =>
  Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null;

const readOptionalJson = (relativePath: string): JsonObject => {
  try {
    const parsed = JSON.parse(readFileSync(join(process.cwd(), relativePath), "utf8"));
    return parsed && typeof parsed === "object" ? parsed as JsonObject : {};
  } catch {
    return {};
  }
};

const LOCAL_HEALTH_ALIASES: Record<string, string> = {
  "transparencia-activa": "cplt",
  "ley-19862": "ley19862",
  "ine-censo-2024": "ine",
};

const localHealth = readOptionalJson("data/etl/source-health.json");
const localCatalog = readOptionalJson("data/lake/catalog/v1/manifest.json");

const percent = (count: number | null, denominator: number | null): number | null => {
  if (count === null || denominator === null || denominator <= 0) return null;
  return Math.round((count / denominator) * 1000) / 10;
};

export function coverageMetric(count: number | null, denominator: number | null): CoverageMetric {
  const value = percent(count, denominator);
  return {
    count,
    denominator,
    percent: value,
    label: value === null ? "No calculable" : `${value.toLocaleString("es-CL", { maximumFractionDigits: 1 })}%`,
  };
}

export function getDataQualityConfig(): SourceConfig[] {
  return sourceConfig as SourceConfig[];
}

export function buildFallbackDataQualitySummary(): DataQualitySummary {
  const transfer = getTransferReleaseMetadata();
  const healthSources = localHealth.sources && typeof localHealth.sources === "object"
    ? localHealth.sources as JsonObject
    : {};
  const catalogSources = Array.isArray(localCatalog.sources) ? localCatalog.sources : [];
  const sources = getDataQualityConfig().map((source) => {
    const healthEntry = healthSources[LOCAL_HEALTH_ALIASES[source.id] ?? source.id];
    const healthRecord = healthEntry && typeof healthEntry === "object" ? healthEntry as JsonObject : {};
    const catalogEntry = catalogSources.find((entry) => entry && typeof entry === "object" && (entry as JsonObject).id === source.id);
    const catalogRecord = catalogEntry && typeof catalogEntry === "object" ? catalogEntry as JsonObject : {};
    const observedCount = safeCount(healthRecord.recordCount);
    const configuredCanonicalCount = safeCount(source.canonicalCount);
    const isTransferRelease = source.id === "ley-19862";
    const canonicalCount = isTransferRelease ? transfer.totalRows : observedCount ?? source.canonicalCount;
    const historicalCount = isTransferRelease ? transfer.totalRows : source.historicalCount;
    const scopeMismatch = !isTransferRelease
      && observedCount !== null
      && configuredCanonicalCount !== null
      && observedCount !== configuredCanonicalCount;
    const reconciliationState: SourceReconciliationState = isTransferRelease
      ? "release_override"
      : observedCount === null
        ? "configured_only"
        : scopeMismatch
          ? "scope_mismatch"
          : "aligned";
    const rawComponents = healthRecord.components && typeof healthRecord.components === "object"
      ? Object.entries(healthRecord.components as JsonObject)
        .map(([key, value]) => [key, safeCount(value)] as const)
        .filter(([, value]) => value !== null)
      : [];
    const components = rawComponents.length > 0 ? Object.fromEntries(rawComponents) : null;
    const reconciliationNote = reconciliationState === "scope_mismatch"
      ? `El snapshot observado informa ${observedCount!.toLocaleString("es-CL")} registros; la referencia configurada es ${configuredCanonicalCount!.toLocaleString("es-CL")}. No se calcula cobertura hasta reconciliar el alcance.`
      : reconciliationState === "release_override"
        ? "El conteo proviene del release vigente validado para esta fuente."
        : reconciliationState === "configured_only"
          ? "No hay un snapshot de salud asociado a este build; se conserva la referencia configurada y no se infiere cobertura vigente."
          : "El conteo observado coincide con la referencia configurada para este alcance.";
    return ({
    id: source.id,
    label: source.label,
    organization: source.organization,
    officialUrl: source.officialUrl,
    scope: source.scope,
    confidenceLevel: source.confidenceLevel as ConfidenceLevel,
    frequency: source.frequency,
    period: source.period,
    lag: source.lag,
    coverageDetail: source.coverageDetail,
    coverageNote: source.coverageNote,
    canonicalCount,
    historicalCount,
    lastSuccessAt: null,
    checksumSha256: null,
    status: source.canonicalCount > 0 ? "parcial" : "no_disponible" as DataQualityStatus,
    statusDetail: source.canonicalCount > 0 ? "Release disponible; la completitud se mantiene separada de la disponibilidad." : "No hay release publicado.",
    modulePath: source.modulePath,
    derived: source.derived,
    metrics: {
      published: coverageMetric(null, null),
      queryable: coverageMetric(source.id === "ley-19862" ? transfer.totalRows : source.queryableCount, canonicalCount),
      related: coverageMetric(source.relatedCount, canonicalCount),
    },
    quality: source.qualityObservations,
    reconciliation: {
      state: reconciliationState,
      comparisonEligible: isTransferRelease || (observedCount !== null && !scopeMismatch),
      configuredCanonicalCount,
      configuredHistoricalCount: source.historicalCount,
      observedCount,
      catalogCount: safeCount(catalogRecord.recordCount),
      components,
      note: reconciliationNote,
    },
    qualityAudit: source.qualityAudit as QualityAuditSnapshot | undefined,
    });
  });
  const totalCanonicalRecords = sources.reduce((sum, source) => sum + source.canonicalCount, 0);
  const totalHistoricalRecords = sources.reduce((sum, source) => sum + source.historicalCount, 0);
  const relatedSources = sources.filter((source) => source.metrics.related.count !== null);
  const totalRelatedRecords = relatedSources.length
    ? relatedSources.reduce((sum, source) => sum + (source.metrics.related.count ?? 0), 0)
    : null;
  const queryableSources = sources.filter((source) => source.metrics.queryable.count !== null);
  const queryableCount = queryableSources.length
    ? queryableSources.reduce((sum, source) => sum + (source.metrics.queryable.count ?? 0), 0)
    : null;
  const queryableDenominator = queryableSources.length
    ? queryableSources.reduce((sum, source) => sum + source.canonicalCount, 0)
    : null;
  return {
    schemaVersion: 1,
    generatedAt: "2026-08-17T22:30:00.000Z",
    sourceCount: sources.length,
    totalCanonicalRecords,
    totalHistoricalRecords,
    totalRelatedRecords,
    metrics: {
      // Sin un snapshot de salud no existe un denominador reconciliado para
      // afirmar cobertura; mostrar un porcentaje aquí convertiría la
      // configuración histórica en una falsa cobertura vigente.
      published: coverageMetric(null, null),
      queryable: coverageMetric(queryableCount, queryableDenominator),
      related: coverageMetric(totalRelatedRecords, totalCanonicalRecords),
    },
    sources,
  };
}

export function readGeneratedDataQualitySummary(): DataQualitySummary {
  const file = join(process.cwd(), "data", "generated", "data-quality-summary.json");
  if (!existsSync(file)) return buildFallbackDataQualitySummary();
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as DataQualitySummary;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.sources)) return buildFallbackDataQualitySummary();
    return parsed;
  } catch {
    return buildFallbackDataQualitySummary();
  }
}
