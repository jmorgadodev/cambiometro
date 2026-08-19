import { apiSuccess, pageLinks, parseRelationQuery, queryErrorResponse } from "@/lib/api-v1";
import { listRelations } from "@/lib/data-platform-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { readR2EntityIndex } from "@/lib/r2-entities";
import { enforcePublicRateLimit } from "@/lib/rate-limit";

function offset(cursor?: string) {
  return cursor ? Number.parseInt(cursor.slice(3), 36) : 0;
}

async function runtimePage(query: ReturnType<typeof parseRelationQuery>) {
  const anchor = query.entityId ?? query.fromId ?? query.toId;
  if (!anchor) return null;
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (!env.PUBLIC_DATA) return null;
    const index = await readR2EntityIndex(env.PUBLIC_DATA, anchor);
    if (!index) return null;
    const relations = [...new Map(index.relations.map((relation) => [relation.id, relation])).values()].filter((relation) =>
      (!query.entityId || relation.fromId === query.entityId || relation.toId === query.entityId)
      && (!query.fromId || relation.fromId === query.fromId)
      && (!query.toId || relation.toId === query.toId)
      && (!query.predicate || relation.predicate === query.predicate));
    const start = offset(query.cursor);
    const data = relations.slice(start, start + query.limit);
    const next = start + data.length;
    return { data, total: relations.length, limit: query.limit, nextCursor: next < relations.length ? `v1_${next.toString(36)}` : null };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const limited = await enforcePublicRateLimit(request, "relations");
  if (limited) return limited;
  try {
    const query = parseRelationQuery(request.url);
    const bundled = await listRelations(query);
    const page = bundled.total > 0 ? bundled : (await runtimePage(query) ?? bundled);
    return apiSuccess(page.data, { total: page.total, limit: page.limit }, pageLinks(request.url, page.nextCursor));
  } catch (error) {
    return queryErrorResponse(error);
  }
}
