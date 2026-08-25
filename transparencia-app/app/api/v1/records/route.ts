import { apiSuccess, pageLinks, parseRecordQuery, queryErrorResponse } from "@/lib/api-v1";
import { listRecords } from "@/lib/data-platform-d1";
import { readR2EvidenceRecords } from "@/lib/r2-records";
import { readR2EntityIndex } from "@/lib/r2-entities";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { enforcePublicRateLimit } from "@/lib/rate-limit";

async function runtimePage(query: ReturnType<typeof parseRecordQuery>) {
  if (!query.source && !query.entityId) return null;
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (!env.PUBLIC_DATA) return null;
    const index = query.entityId ? await readR2EntityIndex(env.PUBLIC_DATA, query.entityId) : null;
    const source = query.source ?? index?.sourceIds ?? index?.sourceId;
    if (!source) return null;
    return readR2EvidenceRecords(env.PUBLIC_DATA, {
      source,
      entityId: query.entityId,
      kind: query.kind,
      from: query.from,
      to: query.to,
      limit: query.limit,
      cursor: query.cursor,
    });
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const limited = await enforcePublicRateLimit(request, "records");
  if (limited) return limited;
  try {
    const query = parseRecordQuery(request.url);
    const bundled = await listRecords(query);
    const page = bundled.total > 0 ? bundled : (await runtimePage(query) ?? bundled);
    return apiSuccess(page.data, { total: page.total, limit: page.limit }, pageLinks(request.url, page.nextCursor));
  } catch (error) {
    return queryErrorResponse(error);
  }
}
