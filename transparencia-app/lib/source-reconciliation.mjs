/**
 * Read-only reconciliation helpers for production, R2 manifests and local
 * snapshots. This module never changes a release and deliberately keeps
 * source categories separate.
 */

const CATEGORY_BY_SOURCE = Object.freeze({
  "gastos_camara": ["gastos"],
  "gastos_senado": ["gastos"],
  "votaciones_camara": ["votaciones"],
  "votaciones_senado": ["votaciones"],
  "asistencia_camara": ["asistencia"],
  "personal-apoyo": ["asesorias"],
  camara: ["remuneraciones", "asesorias", "gastos", "votaciones"],
  senado: ["remuneraciones", "asesorias", "gastos", "votaciones"],
});

const PARENT_SOURCE_IDS = new Set(["camara", "senado"]);

export function sourceCategories(sourceId) {
  return [...(CATEGORY_BY_SOURCE[String(sourceId)] ?? [])];
}

function canonicalId(value) {
  const id = String(value ?? "").trim();
  if (id === "ley19862") return "ley-19862";
  if (id === "cplt") return "transparencia-activa";
  if (id === "ine") return "ine-censo-2024";
  return id;
}

function timestamp(value) {
  if (!value) return null;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function hasNewerProduction(production, local) {
  const productionAt = timestamp(production?.lastUpdated ?? production?.generatedAt);
  const localAt = timestamp(local?.generatedAt ?? local?.lastUpdated);
  return productionAt !== null && (localAt === null || productionAt > localAt);
}

function localChildren(localSources, productionId) {
  return localSources.filter((source) => {
    const id = canonicalId(source.id);
    return id !== productionId && (
      id.startsWith(`${productionId}_`)
      || id.startsWith(`${productionId}-`)
      || id.endsWith(`_${productionId}`)
      || id.endsWith(`-${productionId}`)
    );
  });
}

function categoriesForSources(sources) {
  return [...new Set(sources.flatMap((source) => sourceCategories(source.id)))];
}

function classification({ production, local, children }) {
  const hasCategorySplit = children.length > 0;
  const hasCatalogScopeDifference = local?.catalogRecordCount !== null
    && local?.catalogRecordCount !== undefined
    && Number(local.catalogRecordCount) !== Number(local.recordCount);
  if (production && local && Number(production.recordCount) === Number(local.recordCount) && !hasCategorySplit) return "match";
  if (hasCategorySplit || hasCatalogScopeDifference || (local && sourceCategories(local.id).length > 0 && !production)) return "scope";
  if (production && local && hasNewerProduction(production, local)) return "freshness";
  return "unexplained";
}

function rowFor(production, local, localSources) {
  const id = canonicalId(production?.id ?? local?.id);
  const children = production ? localChildren(localSources, id) : [];
  const localParts = local ? [local, ...children] : children;
  const categories = categoriesForSources(localParts.length ? localParts : production ? [production] : []);
  return {
    id,
    classification: classification({ production, local, children }),
    productionCount: production?.recordCount ?? null,
    localCount: local?.recordCount ?? null,
    localCatalogCount: local?.catalogRecordCount ?? null,
    productionStatus: production?.status ?? null,
    localStatus: local?.status ?? null,
    productionUpdatedAt: production?.lastUpdated ?? production?.generatedAt ?? null,
    localGeneratedAt: local?.generatedAt ?? local?.lastUpdated ?? null,
    productionPeriods: production?.foundPeriods ?? [],
    localPeriods: local?.foundPeriods ?? [],
    localCategories: categories,
    localComponents: localParts.filter((source) => canonicalId(source.id) !== id).map((source) => ({
      id: canonicalId(source.id),
      recordCount: Number(source.recordCount ?? 0),
      categories: sourceCategories(source.id),
    })),
  };
}

/**
 * Reconcile counts without treating a newer production release as a local
 * failure. Inputs are intentionally small summaries, never record datasets.
 */
export function reconcileSourceSnapshots({ production = [], local = [] }) {
  const productionById = new Map(production.map((source) => [canonicalId(source.id), source]));
  const localById = new Map(local.map((source) => [canonicalId(source.id), source]));
  const ids = [...new Set([...productionById.keys(), ...localById.keys()])].sort();
  const rows = ids.map((id) => rowFor(productionById.get(id), localById.get(id), local));
  return {
    generatedAt: new Date().toISOString(),
    sourceCount: rows.length,
    rows,
    summary: {
      match: rows.filter((row) => row.classification === "match").length,
      freshness: rows.filter((row) => row.classification === "freshness").length,
      scope: rows.filter((row) => row.classification === "scope").length,
      unexplained: rows.filter((row) => row.classification === "unexplained").length,
    },
  };
}

export function productionSourcesPayload(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.data;
  if (!Array.isArray(rows)) throw new Error("PRODUCTION_SOURCES_INVALID");
  return rows.map((source) => ({
    id: canonicalId(source.id),
    recordCount: Number(source.recordCount ?? source.records ?? 0),
    status: source.status ?? null,
    lastUpdated: source.lastUpdated ?? source.generatedAt ?? null,
    foundPeriods: Array.isArray(source.foundPeriods) ? source.foundPeriods : [],
  }));
}

export function localCatalogSources(manifest) {
  const rows = Array.isArray(manifest?.sources) ? manifest.sources : [];
  return rows.map((source) => ({
    id: canonicalId(source.id),
    recordCount: Number(source.recordCount ?? 0),
    status: source.status ?? null,
    generatedAt: manifest.generatedAt ?? null,
    foundPeriods: Array.isArray(source.foundPeriods) ? source.foundPeriods : [],
  }));
}

/** Merge the local source-health counters without discarding category splits
 * from the lake catalog. The two counters remain visible for audit purposes. */
export function mergeLocalHealth(manifest, health) {
  const catalog = localCatalogSources(manifest);
  const byId = new Map(catalog.map((source) => [canonicalId(source.id), source]));
  for (const [rawId, rawSource] of Object.entries(health?.sources ?? {})) {
    const id = canonicalId(rawId);
    const existing = byId.get(id);
    const recordCount = Number(rawSource?.recordCount ?? 0);
    byId.set(id, {
      ...(existing ?? { id, foundPeriods: [] }),
      recordCount,
      catalogRecordCount: existing?.recordCount ?? null,
      status: rawSource?.status ?? existing?.status ?? null,
      generatedAt: rawSource?.generatedAt ?? existing?.generatedAt ?? manifest?.generatedAt ?? null,
    });
  }
  return [...byId.values()];
}
