import { apiError, apiSuccess, pageLinks } from "@/lib/api-v1";
import { getEntity, listRecords, listRelations } from "@/lib/data-platform-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { readR2Entity, readR2EntityIndex } from "@/lib/r2-entities";
import type { EvidenceRecord } from "@/lib/data-contracts";
import { personalApoyoEvidenceParaEntidad } from "@/lib/personal-apoyo";

async function allEntityRecords(id: string) {
  const records: EvidenceRecord[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const result = await listRecords({ entityId: id, limit: 100, cursor });
    records.push(...result.data);
    if (!result.nextCursor || result.data.length === 0) break;
    cursor = result.nextCursor;
  }
  return records;
}

async function runtimeEntity(id: string) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (!env.PUBLIC_DATA) return null;
    const [entity, index] = await Promise.all([readR2Entity(env.PUBLIC_DATA, id), readR2EntityIndex(env.PUBLIC_DATA, id)]);
    return entity ? { entity, recordCount: index?.evidenceRecordIds.length ?? 0, relationCount: index?.relations.length ?? 0 } : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9_-]{1,160}$/.test(id)) return apiError("INVALID_ID", "Identificador de entidad inválido.", 400, { id });
  const bundled = await getEntity(id);
  if (bundled) {
    const [platformRecords, supportRecords] = await Promise.all([
      allEntityRecords(id),
      bundled.kind === "person" ? personalApoyoEvidenceParaEntidad(bundled) : Promise.resolve([]),
    ]);
    const records = [...new Map(
      platformRecords.concat(supportRecords).map((record) => [record.id, record]),
    ).values()];
    const relations = (await listRelations({ fromId: id, limit: 100 })).data.concat((await listRelations({ toId: id, limit: 100 })).data);
    const entity = supportRecords.length > 0 && !bundled.sourceIds.includes("personal-apoyo")
      ? { ...bundled, sourceIds: [...bundled.sourceIds, "personal-apoyo"] }
      : bundled;
    return apiSuccess({ ...entity, records, relations }, { recordCount: records.length, relationCount: relations.length }, pageLinks(request.url, null), 3600);
  }
  const runtime = await runtimeEntity(id);
  if (!runtime) return apiError("NOT_FOUND", "Entidad no encontrada.", 404, { id });
  return apiSuccess(runtime.entity, { recordCount: runtime.recordCount, relationCount: runtime.relationCount }, pageLinks(request.url, null), 3600);
}
