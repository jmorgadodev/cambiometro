import { getMunicipalidadesStats } from "@/lib/municipalidades-list";
import { readGeneratedDataQualitySummary, type CoverageMetric, type DataQualityStatus, type QualityAuditSnapshot, type SourceCountReconciliation } from "@/lib/data-quality-summary";

export interface DataQualitySourceRow {
  id: string;
  name: string;
  organization: string;
  officialUrl: string;
  scope: string;
  scopeLabel: string;
  confidenceLevel: string;
  frequency: string;
  status: "operativa" | "anual" | "electoral" | "censal" | "derivada" | "desfasado" | "sin_datos";
  statusLabel: string;
  statusBadgeClass: string;
  canonicalCount: number;
  historicalCount: number;
  periodoReciente: string;
  desfase: string;
  coberturaDetalle: string;
  lastSync: string;
  lastSyncFormatted: string;
  coverageNote: string;
  isDerived: boolean;
  modulePath: string;
  checksumSha256: string | null;
  metrics: { published: CoverageMetric; queryable: CoverageMetric; related: CoverageMetric };
  quality: { observedCount: number; correctedCount: number };
  reconciliation: SourceCountReconciliation;
  qualityAudit?: QualityAuditSnapshot;
}

export interface DataQualitySummary {
  totalFuentes: number;
  fuentesOficiales: number;
  fuentesDerivadas: number;
  fuentesAlDia: number;
  fuentesParciales: number;
  coberturaMunicipalAlDia: number;
  coberturaMunicipalTotal: number;
  guardsCriticos: number;
  totalRegistrosCanonicos: number;
  totalRegistrosHistoricos: number;
  releaseVersion: string;
  releaseChecksum: string;
  ultimaValidacionIso: string;
  ultimaValidacionFormatted: string;
  metrics: { published: CoverageMetric; queryable: CoverageMetric; related: CoverageMetric };
}

const SCOPE_LABELS: Record<string, string> = {
  personal: "Personal y Remuneraciones",
  compras: "Contratación Pública",
  finanzas: "Presupuesto y Fondos",
  probidad: "Probidad y Lobby",
  parlamento: "Actividad Parlamentaria",
  municipios: "Gestión Municipal",
  demografia: "Demografía y Censos",
};

function formatDate(value: string | null, fallback: string): string {
  const date = new Date(value ?? fallback);
  if (Number.isNaN(date.getTime())) return value ?? fallback;
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(date);
}

function legacyStatus(status: DataQualityStatus, frequency: string, derived: boolean): DataQualitySourceRow["status"] {
  if (status === "no_disponible") return "sin_datos";
  if (status === "desfasado") return "desfasado";
  if (derived) return "derivada";
  const normalizedFrequency = frequency.toLowerCase();
  if (normalizedFrequency.includes("cens")) return "censal";
  if (normalizedFrequency.includes("electoral")) return "electoral";
  if (normalizedFrequency.includes("anual")) return "anual";
  return "operativa";
}

function statusLabel(status: DataQualitySourceRow["status"]): string {
  return { operativa: "Operativa", anual: "Publicación anual", electoral: "Por elección", censal: "Censal oficial", derivada: "Consolidación derivada", desfasado: "Desfasado", sin_datos: "Sin datos" }[status];
}

export async function getDataQualityDashboardData(): Promise<{ sources: DataQualitySourceRow[]; summary: DataQualitySummary }> {
  const manifest = readGeneratedDataQualitySummary();
  const muniStats = getMunicipalidadesStats();
  const ultimaValidacionIso = manifest.generatedAt;
  const sources = manifest.sources.map((source) => {
    const status = legacyStatus(source.status, source.frequency, source.derived);
    return {
      id: source.id,
      name: source.label,
      organization: source.organization,
      officialUrl: source.officialUrl,
      scope: source.scope,
      scopeLabel: SCOPE_LABELS[source.scope] ?? source.scope,
      confidenceLevel: source.confidenceLevel,
      frequency: source.frequency,
      status,
      statusLabel: statusLabel(status),
      statusBadgeClass: status === "desfasado" ? "badge badge-warn" : status === "sin_datos" ? "badge" : "badge badge-ok",
      canonicalCount: source.canonicalCount,
      historicalCount: source.historicalCount,
      periodoReciente: source.period,
      desfase: source.lag,
      coberturaDetalle: source.coverageDetail,
      lastSync: source.lastSuccessAt ?? ultimaValidacionIso,
      lastSyncFormatted: formatDate(source.lastSuccessAt, ultimaValidacionIso),
      coverageNote: source.coverageNote,
      isDerived: source.derived,
      modulePath: source.modulePath,
      checksumSha256: source.checksumSha256,
      metrics: source.metrics,
      quality: source.quality,
      reconciliation: source.reconciliation,
      qualityAudit: source.qualityAudit,
    } satisfies DataQualitySourceRow;
  });
  const fuentesDerivadas = sources.filter((source) => source.isDerived).length;
  const fuentesAlDia = sources.filter((source) => source.status !== "desfasado" && source.status !== "sin_datos").length;
  const fuentesParciales = sources.filter((source) => source.status === "anual" || source.status === "electoral").length;
  return {
    sources,
    summary: {
      totalFuentes: sources.length,
      fuentesOficiales: sources.length - fuentesDerivadas,
      fuentesDerivadas,
      fuentesAlDia,
      fuentesParciales,
      coberturaMunicipalAlDia: muniStats.alDiaCount,
      coberturaMunicipalTotal: muniStats.totalComunas,
      guardsCriticos: 0,
      totalRegistrosCanonicos: manifest.totalCanonicalRecords,
      totalRegistrosHistoricos: manifest.totalHistoricalRecords,
      releaseVersion: "data-quality-summary-v1",
      releaseChecksum: manifest.manifestChecksumSha256?.slice(0, 16) ?? "pendiente",
      ultimaValidacionIso,
      ultimaValidacionFormatted: formatDate(ultimaValidacionIso, ultimaValidacionIso),
      metrics: manifest.metrics,
    },
  };
}
