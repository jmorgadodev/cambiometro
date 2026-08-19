import { apiSuccess, pageLinks } from "@/lib/api-v1";
import { listPublishedSourceManifests } from "@/lib/published-sources";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const data = await listPublishedSourceManifests();
  return apiSuccess(data, {
    total: data.length,
    statuses: Object.fromEntries(["connected", "partial", "stale", "unavailable"].map((status) => [status, data.filter((source) => source.status === status).length])),
  }, pageLinks(request.url, null), 3600);
}
