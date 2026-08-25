import { apiSuccess, pageLinks, parseCrossQuery, queryErrorResponse } from "@/lib/api-v1";
import { listCrosses } from "@/lib/data-platform-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { readR2Entities, readR2EntityIndex } from "@/lib/r2-entities";
import { readR2EvidenceRecords } from "@/lib/r2-records";
import { enforcePublicRateLimit } from "@/lib/rate-limit";

function offset(cursor?: string) {
  return cursor ? Number.parseInt(cursor.slice(3), 36) : 0;
}

async function runtimePage(query: ReturnType<typeof parseCrossQuery>) {
  const anchor = query.entityId ?? query.counterpartyId;
  if (!anchor) return null;
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (!env.PUBLIC_DATA) return null;
    const index = await readR2EntityIndex(env.PUBLIC_DATA, anchor);
    const indexSources = index?.sourceIds ?? (index ? [index.sourceId] : []);
    if (!index || (query.source && !indexSources.includes(query.source))) return null;
    const relations = [...new Map(index.relations.map((relation) => [relation.id, relation])).values()].filter((relation) => {
      if (query.entityId && relation.fromId !== query.entityId && relation.toId !== query.entityId) return false;
      if (query.counterpartyId && relation.fromId !== query.counterpartyId && relation.toId !== query.counterpartyId) return false;
      return !query.predicate || relation.predicate === query.predicate;
    });
    const start = offset(query.cursor);
    const selected = relations.slice(start, start + query.limit);
    const recordIds = [...new Set(selected.flatMap((relation) => relation.evidenceRecordIds))];
    const evidencePage = await readR2EvidenceRecords(env.PUBLIC_DATA, {
      source: query.source ?? indexSources,
      recordIds,
      kind: query.kind,
      from: query.from,
      to: query.to,
      limit: 100,
    });
    if (!evidencePage) return null;
    const evidenceById = new Map(evidencePage.data.map((record) => [record.id, record]));
    const entityIds = [...new Set(selected.flatMap((relation) => [relation.fromId, relation.toId]))];
    const entityCache = new Map((await readR2Entities(env.PUBLIC_DATA, entityIds)).map((entity) => [entity.id, entity]));
    const rows = [];
    for (const relation of selected) {
      const evidence = relation.evidenceRecordIds.map((id) => evidenceById.get(id)).filter(Boolean);
      if (evidence.length === 0) continue;
      const fromEntity = entityCache.get(relation.fromId);
      const toEntity = entityCache.get(relation.toId);
      if (fromEntity && toEntity) rows.push({ relation, fromEntity, toEntity, evidence });
    }
    const next = start + selected.length;
    return { data: rows, total: relations.length, limit: query.limit, nextCursor: next < relations.length ? `v1_${next.toString(36)}` : null };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const limited = await enforcePublicRateLimit(request, "crosses");
  if (limited) return limited;
  try {
    const query = parseCrossQuery(request.url);
    const bundled = await listCrosses(query);
    const page = bundled.total > 0 ? bundled : (await runtimePage(query) ?? bundled);
    return apiSuccess(page.data, {
      total: page.total,
      limit: page.limit,
      disclaimer: "Una relación documental no implica irregularidad ni responsabilidad.",
    }, pageLinks(request.url, page.nextCursor));
  } catch (error) {
    return queryErrorResponse(error);
  }
}
