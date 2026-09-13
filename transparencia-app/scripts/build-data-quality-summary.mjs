import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { reconcileSourceCounts } from "../lib/data-quality-reconciliation.mjs";

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
  const resolvedCounts = reconcileSourceCounts({ source, healthEntry, catalogEntry, transferRows });
  const { canonicalCount, historicalCount, queryableCount, reconciliation } = resolvedCounts;
  const configuredPublicHistoricalCount = Number.isSafeInteger(source.publicHistoricalCount)
    ? source.publicHistoricalCount
    : null;
  const publicHistoricalCount = configuredPublicHistoricalCount !== null
    ? configuredPublicHistoricalCount
    : Number.isSafeInteger(partitionCount) && partitionCount > 0
      ? Math.max(canonicalCount, partitionCount)
      : canonicalCount;
  const lastSuccessAt = healthEntry?.generatedAt ?? catalogEntry?.generatedAt ?? null;
  const sourceStatus = healthEntry?.status ?? catalogEntry?.status ?? null;
  const status = canonicalCount <= 0
    ? "no_disponible"
    : sourceStatus === "stale"
      ? "desfasado"
      : sourceStatus === "connected" || sourceStatus === "complete"
        ? "completo"
        : "parcial";
  const period = Array.isArray(catalogEntry?.foundPeriods) && catalogEntry.foundPeriods.length
    ? catalogEntry.foundPeriods[catalogEntry.foundPeriods.length - 1]
    : source.period;
  const checksumSha256 = catalogEntry?.indexChecksumSha256 ?? null;
  return {
    ...source,
    canonicalCount,
    historicalCount,
    catalogDeclaredCount: Number.isSafeInteger(source.catalogDeclaredCount) ? source.catalogDeclaredCount : null,
    publicHistoricalCount,
    period,
    lastSuccessAt,
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
      queryable: metric(queryableCount, canonicalCount),
      related: metric(source.relatedCount, canonicalCount),
    },
    quality: source.qualityObservations,
    reconciliation,
  };
});

for (const source of sources) {
  if (!source.reconciliation.comparisonEligible) {
    source.metrics.published = metric(null, null);
    source.statusDetail = source.reconciliation.note;
  }
}

const totalCanonicalRecords = sources.reduce((sum, source) => sum + source.canonicalCount, 0);
const totalHistoricalRecords = sources.reduce((sum, source) => sum + source.historicalCount, 0);
const queryableSources = sources.filter((source) => source.reconciliation.comparisonEligible && source.metrics.queryable.count !== null);
const queryableCount = queryableSources.length ? queryableSources.reduce((sum, source) => sum + source.metrics.queryable.count, 0) : null;
const queryableDenominator = queryableSources.length ? queryableSources.reduce((sum, source) => sum + source.canonicalCount, 0) : null;
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
