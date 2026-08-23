import { cache } from "react";
import { getD1Database } from "@/lib/db";
import type { EntidadD1, RecordD1, RelationD1 } from "@/lib/db";
import type { D1Database } from "@cloudflare/workers-types";
import type {
  CanonicalEntity,
  CrossEdge,
  CursorPage,
  EvidenceKind,
  EvidenceRecord,
  RelationEdge,
  SourceManifest,
} from "@/lib/data-contracts";

const SOURCE_DEFINITIONS: Array<Omit<SourceManifest, "foundPeriods" | "lastUpdated" | "checksumSha256" | "recordCount" | "errorCount" | "status" | "statusDetail">> = [
  { id: "personal-apoyo", label: "Personal de apoyo parlamentario", organization: "Congreso Nacional", url: "https://www.camara.cl/transparencia/transparencia_activa.aspx", license: "Datos públicos oficiales", commercialUse: "unknown", expectedCoverage: "Personal, cargos y montos publicados por Cámara y Senado" },
  { id: "infoprobidad", label: "InfoProbidad", organization: "Consejo para la Transparencia", url: "https://datos.cplt.cl/", license: "Catálogo CPLT", commercialUse: "unknown", expectedCoverage: "Declaraciones completas e históricos publicados" },
  { id: "infolobby", label: "InfoLobby", organization: "Consejo para la Transparencia", url: "https://datos.infolobby.cl/", license: "Catálogo CPLT", commercialUse: "unknown", expectedCoverage: "Audiencias, viajes, donativos y sujetos publicados" },
  { id: "camara", label: "Cámara de Diputadas y Diputados", organization: "Congreso Nacional", url: "https://www.camara.cl/transparencia/transparencia_activa.aspx", license: "Datos públicos oficiales", commercialUse: "unknown", expectedCoverage: "Autoridades, votaciones, asistencia, dietas, gastos, asesorías y pasajes" },
  { id: "senado", label: "Senado", organization: "Congreso Nacional", url: "https://www.senado.cl/transparencia/transparencia-activa", license: "Datos públicos oficiales", commercialUse: "unknown", expectedCoverage: "Autoridades, votaciones, asistencia, dietas, gastos, asesorías y pasajes" },
  { id: "chilecompra", label: "ChileCompra OCDS", organization: "Dirección ChileCompra", url: "https://datos-abiertos.chilecompra.cl/descargas/procesos-ocds", license: "OCDS ChileCompra", commercialUse: "allowed", expectedCoverage: "Licitaciones desde 2009 y compras directas/convenios desde 2019" },
  { id: "dipres", label: "DIPRES", organization: "Dirección de Presupuestos", url: "https://www.dipres.gob.cl/597/w3-multipropertyvalues-25910-37782.html", license: "Datos públicos oficiales", commercialUse: "unknown", expectedCoverage: "Ley, presupuesto inicial/vigente y ejecución mensual" },
  { id: "sinim", label: "SINIM", organization: "SUBDERE", url: "https://datos.sinim.gov.cl/datos_municipales.php", license: "Atribución; uso comercial excluido", commercialUse: "prohibited", expectedCoverage: "345 municipalidades e indicadores publicados" },
  { id: "contraloria", label: "Contraloría General", organization: "Contraloría General de la República", url: "https://www.contraloria.cl/", license: "Documentos públicos oficiales", commercialUse: "unknown", expectedCoverage: "Índice, CIC e informes con localizador de página" },
  { id: "ley-19862", label: "Registro Ley 19.862", organization: "Ministerio de Hacienda", url: "https://www.registros19862.cl/", license: "Registro público", commercialUse: "unknown", expectedCoverage: "Entidades receptoras, transferencias y controles" },
  { id: "transparencia-activa", label: "Transparencia Activa", organization: "Organismos públicos de Chile", url: "https://www.portaltransparencia.cl/", license: "Datos públicos oficiales", commercialUse: "unknown", expectedCoverage: "Nóminas y remuneraciones publicadas" },
  { id: "servel", label: "SERVEL", organization: "Servicio Electoral de Chile", url: "https://www.servel.cl/resultados-preliminares-eleccion-presidencial-y-parlamentarias-2025/", license: "Datos públicos oficiales", commercialUse: "unknown", expectedCoverage: "Resultados, candidaturas, partidos y gastos electorales; la partición 2025 conserva su carácter preliminar" },
  { id: "ine-censo-2024", label: "INE Censo 2024", organization: "Instituto Nacional de Estadísticas", url: "https://censo2024.ine.gob.cl/resultados/", license: "Datos públicos oficiales", commercialUse: "unknown", expectedCoverage: "Población, hogares y viviendas de las 346 comunas de Chile" },
];

export function canonicalSourceId(sourceId: string) {
  if (["votaciones_camara", "gastos_camara", "asistencia_camara"].includes(sourceId)) return "camara";
  if (["votaciones_senado", "gastos_senado"].includes(sourceId)) return "senado";
  return sourceId;
}

import { decodeCursor, makeCursorPage, paginate } from "@/lib/data-platform-core";


function canonicalEntityFromRow(row: EntidadD1): CanonicalEntity {
  return {
    id: row.id,
    kind: row.kind as CanonicalEntity["kind"],
    name: row.name,
    identifiers: JSON.parse(row.identifiers_json),
    attributes: JSON.parse(row.attributes_json),
    sourceIds: JSON.parse(row.source_ids_json),
    updatedAt: row.updated_at,
  };
}

function evidenceRecordFromRow(row: RecordD1): EvidenceRecord {
  return {
    id: row.id,
    kind: row.kind as EvidenceKind,
    sourceId: row.source_id,
    title: row.title,
    description: row.description,
    occurredAt: row.occurred_at,
    period: JSON.parse(row.period_json),
    subjectEntityIds: JSON.parse(row.subject_entity_ids_json),
    objectEntityIds: JSON.parse(row.object_entity_ids_json),
    amount: row.amount_json ? JSON.parse(row.amount_json) : null,
    evidence: JSON.parse(row.evidence_json),
    data: JSON.parse(row.data_json),
  };
}

type EntityAliasRow = { alias_id: string | null; canonical_id: string };

export async function resolveEntityScope(
  db: Pick<D1Database, "prepare">,
  id: string,
): Promise<{ canonicalId: string; ids: string[] }> {
  try {
    const { results } = await db.prepare(`WITH target(canonical_id) AS (
      SELECT COALESCE((SELECT canonical_id FROM entity_aliases WHERE alias_id = ?), ?)
    )
    SELECT aliases.alias_id, target.canonical_id
    FROM target
    LEFT JOIN entity_aliases aliases ON aliases.canonical_id = target.canonical_id
    ORDER BY aliases.alias_id`).bind(id, id).all<EntityAliasRow>();
    const canonicalId = results[0]?.canonical_id ?? id;
    const aliasIds = results.map((row) => row.alias_id).filter((aliasId): aliasId is string => Boolean(aliasId));
    return { canonicalId, ids: [canonicalId, ...aliasIds] };
  } catch {
    return { canonicalId: id, ids: [id] };
  }
}

function canonicalizeScopedId(id: string, scopes: Array<{ canonicalId: string; ids: string[] } | undefined>) {
  return scopes.find((scope) => scope?.ids.includes(id))?.canonicalId ?? id;
}

/** @internal Selecciona IDs en lotes para mantener una sola ida y vuelta D1. */
export async function selectRowsByIds<T>(
  db: Pick<D1Database, "prepare" | "batch">,
  table: "entities" | "records",
  ids: string[],
): Promise<T[]> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return [];
  const chunks: string[][] = [];
  for (let index = 0; index < uniqueIds.length; index += 80) chunks.push(uniqueIds.slice(index, index + 80));
  const statements = chunks.map((chunk) => db
    .prepare(`SELECT * FROM ${table} WHERE id IN (${chunk.map(() => "?").join(",")})`)
    .bind(...chunk));
  const batches = await db.batch<T>(statements);
  return batches.flatMap((batch) => batch.results ?? []);
}

async function bundledPlatform() {
  return import("@/lib/data-platform-v1");
}

export async function listEntities(params: { kind?: CanonicalEntity["kind"]; source?: string; limit?: number; cursor?: string } = {}) {
  const db = await getD1Database();
  if (!db) return (await bundledPlatform()).listEntities(params);

  const limit = Math.min(100, Math.max(1, Math.trunc(params.limit || 20)));
  const offset = decodeCursor(params.cursor);

  let query = "SELECT * FROM entities WHERE 1=1";
  const bindings: unknown[] = [];

  if (params.kind) {
    query += " AND kind = ?";
    bindings.push(params.kind);
  }
  if (params.source) {
    query += " AND source_ids_json LIKE ?";
    bindings.push(`%${params.source}%`);
  }

  const countResult = await db.prepare(query.replace("SELECT *", "SELECT count(*) as total")).bind(...bindings).first<{total: number}>();
  const total = countResult?.total || 0;

  query += ` LIMIT ${limit} OFFSET ${offset}`;
  const { results } = await db.prepare(query).bind(...bindings).all<EntidadD1>();

  const data = results.map(canonicalEntityFromRow);

  return makeCursorPage(data, total, limit, offset);
}

function entitySearchTokens(query: string) {
  return query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean).slice(0, 8);
}

/** Busca entidades canónicas y resuelve aliases para incluir autoridades históricas. */
export async function searchEntities(query: string, requestedLimit = 25): Promise<CanonicalEntity[]> {
  const tokens = entitySearchTokens(query);
  if (tokens.length === 0) return [];
  const db = await getD1Database();
  if (!db) return (await bundledPlatform()).searchEntities(query, requestedLimit);
  const limit = Math.min(50, Math.max(1, Math.trunc(requestedLimit)));
  const normalizedName = "lower(replace(replace(replace(replace(replace(replace(name,'á','a'),'é','e'),'í','i'),'ó','o'),'ú','u'),'ñ','n'))";
  const where = tokens.map(() => `${normalizedName} LIKE ?`).join(" AND ");
  const sql = `WITH matches(id) AS (
    SELECT DISTINCT coalesce(aliases.canonical_id, e.id)
    FROM entities e
    LEFT JOIN entity_aliases aliases ON aliases.alias_id = e.id
    WHERE ${where}
    LIMIT ${limit * 3}
  )
  SELECT canonical.* FROM matches
  JOIN entities canonical ON canonical.id = matches.id
  ORDER BY canonical.name, canonical.id
  LIMIT ${limit}`;
  try {
    const { results } = await db.prepare(sql).bind(...tokens.map((token) => `%${token}%`)).all<EntidadD1>();
    return results.map(canonicalEntityFromRow);
  } catch {
    const fallbackSql = `SELECT * FROM entities WHERE ${where} ORDER BY name, id LIMIT ${limit}`;
    const { results } = await db.prepare(fallbackSql).bind(...tokens.map((token) => `%${token}%`)).all<EntidadD1>();
    return results.map(canonicalEntityFromRow);
  }
}

export const getEntity = cache(async function getEntity(id: string): Promise<CanonicalEntity | undefined> {
  const db = await getD1Database();
  if (!db) return (await bundledPlatform()).getEntity(id);

  const scope = await resolveEntityScope(db, id);
  const rows = await selectRowsByIds<EntidadD1>(db, "entities", scope.ids);
  const canonicalRow = rows.find((row) => row.id === scope.canonicalId) ?? rows.find((row) => row.id === id);
  if (!canonicalRow) return (await bundledPlatform()).getEntity(id);
  const entity = canonicalEntityFromRow(canonicalRow);
  const identifiers = rows.flatMap((row) => canonicalEntityFromRow(row).identifiers);
  const uniqueIdentifiers = [...new Map(identifiers.map((identifier) => [`${identifier.scheme}|${identifier.value}`, identifier])).values()];
  const sourceIds = [...new Set(rows.flatMap((row) => canonicalEntityFromRow(row).sourceIds))];
  const updatedAt = rows.map((row) => row.updated_at).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
  return { ...entity, id: scope.canonicalId, identifiers: uniqueIdentifiers, sourceIds, updatedAt };
});

export async function getEntitiesByIds(ids: string[]): Promise<CanonicalEntity[]> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return [];
  const db = await getD1Database();
  if (!db) {
    const platform = await bundledPlatform();
    const entities = await Promise.all(uniqueIds.map((id) => platform.getEntity(id)));
    return entities.filter((entity): entity is CanonicalEntity => Boolean(entity));
  }

  const rows = await selectRowsByIds<EntidadD1>(db, "entities", uniqueIds);
  return rows.map(canonicalEntityFromRow);
}

export async function listRecords(params: { entityId?: string; kind?: EvidenceKind; source?: string; from?: string; to?: string; limit?: number; cursor?: string } = {}) {
  const db = await getD1Database();
  if (!db) return (await bundledPlatform()).listRecords(params);

  const limit = Math.min(100, Math.max(1, Math.trunc(params.limit || 20)));
  const offset = decodeCursor(params.cursor);

  let query = "SELECT * FROM records WHERE 1=1";
  const bindings: unknown[] = [];
  const entityScope = params.entityId ? await resolveEntityScope(db, params.entityId) : undefined;

  if (entityScope) {
    const placeholders = entityScope.ids.map(() => "?").join(",");
    query += ` AND (EXISTS (SELECT 1 FROM record_subjects WHERE record_subjects.record_id=records.id AND record_subjects.entity_id IN (${placeholders})) OR EXISTS (SELECT 1 FROM record_objects WHERE record_objects.record_id=records.id AND record_objects.entity_id IN (${placeholders})))`;
    bindings.push(...entityScope.ids, ...entityScope.ids);
  }
  if (params.kind) {
    query += " AND kind = ?";
    bindings.push(params.kind);
  }
  if (params.source) {
    query += " AND source_id = ?";
    bindings.push(params.source);
  }
  if (params.from) {
    query += " AND occurred_at >= ?";
    bindings.push(params.from);
  }
  if (params.to) {
    query += " AND occurred_at <= ?";
    bindings.push(params.to);
  }

  const countResult = await db.prepare(query.replace("SELECT *", "SELECT count(*) as total")).bind(...bindings).first<{total: number}>();
  const total = countResult?.total || 0;

  query += ` LIMIT ${limit} OFFSET ${offset}`;
  const { results } = await db.prepare(query).bind(...bindings).all<RecordD1>();

  const data = results.map(evidenceRecordFromRow).map((record) => entityScope ? ({
    ...record,
    subjectEntityIds: record.subjectEntityIds.map((entityId) => canonicalizeScopedId(entityId, [entityScope])),
    objectEntityIds: record.objectEntityIds.map((entityId) => canonicalizeScopedId(entityId, [entityScope])),
  }) : record);

  if (data.length === 0) {
    return (await bundledPlatform()).listRecords(params);
  }

  return makeCursorPage(data, total, limit, offset);
}

export async function listRelations(params: { entityId?: string; fromId?: string; toId?: string; predicate?: string; limit?: number; cursor?: string } = {}) {
  const db = await getD1Database();
  if (!db) return (await bundledPlatform()).listRelations(params);

  const limit = Math.min(100, Math.max(1, Math.trunc(params.limit || 20)));
  const offset = decodeCursor(params.cursor);

  let query = `WITH relation_view AS (
    SELECT id,from_id,predicate,to_id,evidence_record_ids_json,period_json,reconciliation_json,disclaimer,source_id
    FROM relations
    UNION ALL
    SELECT 'virtual-' || records.id || '-' || subjects.entity_id || '-' || objects.entity_id,
      subjects.entity_id,
      CASE records.kind
        WHEN 'authority' THEN 'holds_mandate_in'
        WHEN 'vote' THEN 'has_vote_record'
        WHEN 'attendance' THEN 'has_attendance_record'
        WHEN 'expense' THEN 'has_expense_record'
        WHEN 'contract' THEN 'contracted_with'
        WHEN 'purchase' THEN 'purchased_from'
        WHEN 'transfer' THEN 'transferred_to'
        WHEN 'lobby' THEN 'has_lobby_record'
        ELSE 'has_evidence'
      END,
      objects.entity_id,
      json_array(records.id),records.period_json,
      json_object('method','official_id','confidence',1),
      'La relacion documental no implica irregularidad ni responsabilidad.',
      records.source_id
    FROM record_subjects subjects
    JOIN record_objects objects ON objects.record_id=subjects.record_id
    JOIN records ON records.id=subjects.record_id
    WHERE records.source_id IN ('camara','gastos_camara','gastos_senado','votaciones_senado','infolobby','chilecompra','ley-19862')
  ) SELECT * FROM relation_view WHERE 1=1`;
  const bindings: unknown[] = [];
  const entityScope = params.entityId ? await resolveEntityScope(db, params.entityId) : undefined;
  const fromScope = !params.entityId && params.fromId ? await resolveEntityScope(db, params.fromId) : undefined;
  const toScope = params.toId ? await resolveEntityScope(db, params.toId) : undefined;

  if (entityScope) {
    const placeholders = entityScope.ids.map(() => "?").join(",");
    query += ` AND (from_id IN (${placeholders}) OR to_id IN (${placeholders}))`;
    bindings.push(...entityScope.ids, ...entityScope.ids);
  } else if (fromScope) {
    query += ` AND from_id IN (${fromScope.ids.map(() => "?").join(",")})`;
    bindings.push(...fromScope.ids);
  }
  if (toScope) {
    query += ` AND to_id IN (${toScope.ids.map(() => "?").join(",")})`;
    bindings.push(...toScope.ids);
  }
  if (params.predicate) {
    query += " AND predicate = ?";
    bindings.push(params.predicate);
  }

  const countResult = await db.prepare(query.replace("SELECT *", "SELECT count(*) as total")).bind(...bindings).first<{total: number}>();
  const total = countResult?.total || 0;

  query += ` LIMIT ${limit} OFFSET ${offset}`;
  const { results } = await db.prepare(query).bind(...bindings).all<RelationD1>();

  const data: RelationEdge[] = results.map((r: RelationD1) => ({
    id: r.id,
    fromId: canonicalizeScopedId(r.from_id, [entityScope, fromScope, toScope]),
    predicate: r.predicate,
    toId: canonicalizeScopedId(r.to_id, [entityScope, fromScope, toScope]),
    evidenceRecordIds: JSON.parse(r.evidence_record_ids_json),
    period: JSON.parse(r.period_json),
    reconciliation: JSON.parse(r.reconciliation_json),
    disclaimer: r.disclaimer
  }));

  if (data.length === 0) {
    return (await bundledPlatform()).listRelations(params);
  }

  return makeCursorPage(data, total, limit, offset);
}

export async function listSourceManifests(): Promise<SourceManifest[]> {
  const db = await getD1Database();

  if (!db) {
    return SOURCE_DEFINITIONS.map(source => ({
      ...source,
      foundPeriods: [],
      lastUpdated: null,
      checksumSha256: null,
      recordCount: 0,
      errorCount: 0,
      status: "unavailable",
      statusDetail: "D1 database not bound."
    }));
  }

  try {
    const [recordStats, stateRows] = await Promise.all([
      db.prepare("SELECT source_id, count(*) as cnt FROM records GROUP BY source_id").all<{source_id: string, cnt: number}>(),
      db.prepare("SELECT source_id,status,record_count,checksum_sha256,generated_at,last_success_at,error FROM source_state").all<{
        source_id: string;
        status: string;
        record_count: number;
        checksum_sha256: string | null;
        generated_at: string | null;
        last_success_at: string | null;
        error: string | null;
      }>(),
    ]);

    const statsBySource = new Map<string, { count: number }>();
    for (const row of recordStats.results) {
      const sourceId = canonicalSourceId(row.source_id);
      statsBySource.set(sourceId, { count: (statsBySource.get(sourceId)?.count ?? 0) + Number(row.cnt) });
    }
    const stateBySource = new Map(stateRows.results.map((row) => [canonicalSourceId(row.source_id), row]));

    return SOURCE_DEFINITIONS.map((source) => {
      const stats = statsBySource.get(source.id);
      const materializedCount = stats?.count || 0;
      const state = stateBySource.get(source.id);
      const archiveOnly = state?.status === "archive_only";
      const projectionOnly = source.id === "personal-apoyo";
      const count = archiveOnly || projectionOnly
        ? Math.max(materializedCount, Number(state?.record_count ?? 0))
        : materializedCount;
      const hasSnapshot = count > 0;
      const foundPeriods: string[] = []; // Omitted for simplicity

      return {
        ...source,
        foundPeriods,
        lastUpdated: state?.last_success_at ?? state?.generated_at ?? null,
        checksumSha256: state?.checksum_sha256 ?? null,
        recordCount: count,
        errorCount: state?.error ? 1 : 0,
        status: archiveOnly ? "partial" : hasSnapshot ? "connected" : "unavailable",
        statusDetail: archiveOnly
          ? "Histórico íntegro en R2; se consulta bajo demanda para preservar capacidad en D1."
          : hasSnapshot ? "Datos cargados desde D1" : "Sin datos",
        storageTier: archiveOnly ? "r2" : "d1",
      };
    });
  } catch {
    return SOURCE_DEFINITIONS.map(source => ({
      ...source,
      foundPeriods: [],
      lastUpdated: null,
      checksumSha256: null,
      recordCount: 0,
      errorCount: 0,
      status: "connected",
      statusDetail: "Fallback local / D1 no inicializado."
    }));
  }
}

type DataPlatformSummary = { totalRecords: number; updatedAt: string | null };

/** @internal Mantiene operativa la lectura local cuando Wrangler expone un D1 sin materializar. */
export async function resolveDataPlatformSummary(
  db: Pick<D1Database, "prepare"> | null,
  fallback: () => Promise<DataPlatformSummary>,
): Promise<DataPlatformSummary> {
  if (!db) return fallback();
  try {
    const [records, state] = await Promise.all([
      db.prepare("SELECT count(*) AS total FROM records").first<{ total: number }>(),
      db.prepare("SELECT max(coalesce(last_success_at, generated_at)) AS updated_at FROM source_state").first<{ updated_at: string | null }>(),
    ]);
    return { totalRecords: Number(records?.total ?? 0), updatedAt: state?.updated_at ?? null };
  } catch {
    return fallback();
  }
}

export async function getDataPlatformSummary() {
  const db = await getD1Database();
  return resolveDataPlatformSummary(db, async () => {
    const bundled = await bundledPlatform();
    return { totalRecords: bundled.listRecords({ limit: 1 }).total, updatedAt: null };
  });
}

export async function listCrosses(params: {
  entityId?: string;
  counterpartyId?: string;
  predicate?: string;
  kind?: EvidenceKind;
  source?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
} = {}) {
  const db = await getD1Database();
  if (!db) return (await bundledPlatform()).listCrosses(params);
  const relationsPage = await listRelations({
    entityId: params.entityId || params.counterpartyId,
    predicate: params.predicate,
    limit: params.limit,
    cursor: params.cursor
  });

  const entityIds = relationsPage.data.flatMap((relation) => [relation.fromId, relation.toId]);
  const evidenceIds = relationsPage.data.flatMap((relation) => relation.evidenceRecordIds);
  const [entityRows, recordRows] = await Promise.all([
    selectRowsByIds<EntidadD1>(db, "entities", entityIds),
    selectRowsByIds<RecordD1>(db, "records", evidenceIds),
  ]);
  const entitiesById = new Map(entityRows.map((row) => [row.id, canonicalEntityFromRow(row)]));
  const recordsById = new Map(recordRows.map((row) => [row.id, evidenceRecordFromRow(row)]));

  const rows = [];
  for (const relation of relationsPage.data) {
    if (params.entityId && relation.fromId !== params.entityId && relation.toId !== params.entityId) continue;
    if (params.counterpartyId && relation.fromId !== params.counterpartyId && relation.toId !== params.counterpartyId) continue;

    const fromEntity = entitiesById.get(relation.fromId);
    const toEntity = entitiesById.get(relation.toId);
    if (!fromEntity || !toEntity) continue;

    const evidence = relation.evidenceRecordIds
      .map((recordId) => recordsById.get(recordId))
      .filter((record): record is EvidenceRecord => Boolean(record));

    const filteredEvidence = evidence.filter((record) => {
      const date = record.occurredAt?.slice(0, 10) ?? "";
      return (!params.kind || record.kind === params.kind)
        && (!params.source || record.sourceId === params.source)
        && (!params.from || date >= params.from)
        && (!params.to || date <= params.to);
    });

    if (filteredEvidence.length > 0) {
      rows.push({ relation, fromEntity, toEntity, evidence: filteredEvidence });
    }
  }

  return makeCursorPage(rows, relationsPage.total, relationsPage.limit, decodeCursor(params.cursor));
}

export async function getAllCrosses(): Promise<CrossEdge[]> {
  return (await bundledPlatform()).getAllCrosses();
}
