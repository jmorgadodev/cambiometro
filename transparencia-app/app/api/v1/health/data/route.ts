import { evaluateDataHealth, publicDataHealth, type EtlRunRow, type SourceCountRow, type SourceStateRow } from "@/lib/data-health";
import { getD1Database } from "@/lib/db";

export const dynamic = "force-dynamic";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(request: Request) {
  try {
    const db = await getD1Database();
    if (!db) throw new Error("D1_NOT_BOUND");
    const [stateResult, countResult, latestRun] = await Promise.all([
      db.prepare("SELECT source_id,status,record_count,generated_at,last_success_at,error,published_version FROM source_state ORDER BY source_id").all<SourceStateRow>(),
      db.prepare("SELECT source_id,count(*) AS count FROM records GROUP BY source_id ORDER BY source_id").all<SourceCountRow>(),
      db.prepare("SELECT id,status,started_at,finished_at FROM etl_runs ORDER BY started_at DESC LIMIT 1").first<EtlRunRow>(),
    ]);
    const health = evaluateDataHealth({ states: stateResult.results, counts: countResult.results, latestRun });
    const publicHealth = publicDataHealth(health);
    return Response.json({
      data: { status: publicHealth.healthy ? "healthy" : "degraded", latestRun: publicHealth.latestRun, sources: publicHealth.sources },
      meta: { version: "v1", checkedAt: new Date().toISOString(), ...publicHealth.summary },
      links: { self: request.url },
    }, { status: health.healthy ? 200 : 503, headers });
  } catch {
    return Response.json({
      data: { status: "unavailable", latestRun: null, sources: [] },
      meta: { version: "v1", checkedAt: new Date().toISOString(), reason: "DATA_HEALTH_UNAVAILABLE" },
      links: { self: request.url },
    }, { status: 503, headers });
  }
}
