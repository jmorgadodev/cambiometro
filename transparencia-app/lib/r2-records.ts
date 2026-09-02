import type { EvidenceRecord } from "./data-contracts";
import type { R2PublicCatalog } from "./r2-catalog";

interface LakeRecord {
  id: string;
  sourceId: string;
  kind: EvidenceRecord["kind"] | "evidence";
  occurredAt: string | null;
  evidence?: { sourceUrl?: string | null };
  data: Record<string, unknown>;
}

interface PartitionManifest {
  projectionChecksumSha256: string;
  artifacts: Array<{ key: string; checksumSha256: string; releaseAssetName: string }>;
}

interface R2ObjectBodyLike {
  json<T>(): Promise<T>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface R2BucketLike {
  get(key: string): Promise<R2ObjectBodyLike | null>;
  put?(key: string, value: ArrayBuffer): Promise<unknown>;
}

const RELEASE_BASE_URL = "https://github.com/jmorgadodev/transparencia.impulsacv.cl/releases/download";

function bufferedObject(data: ArrayBuffer): R2ObjectBodyLike {
  return {
    async json<T>() { return JSON.parse(new TextDecoder().decode(data)) as T; },
    async arrayBuffer() { return data; },
  };
}

async function readHotOrArchivedObject(bucket: R2BucketLike, key: string, releaseTag: string, releaseAssetName: string) {
  const hot = await bucket.get(key);
  if (hot) return hot;
  const url = `${RELEASE_BASE_URL}/${encodeURIComponent(releaseTag)}/${encodeURIComponent(releaseAssetName)}`;
  const response = await fetch(url, { headers: { Accept: "application/octet-stream" } });
  if (!response.ok) return null;
  const data = await response.arrayBuffer();
  if (bucket.put) {
    try { await bucket.put(key, data.slice(0)); } catch { /* A cold read remains valid when cache writes are unavailable. */ }
  }
  return bufferedObject(data);
}

async function checksumSha256(data: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function projectLakeEvidence(record: LakeRecord, checksumSha256: string | null, retrievedAt: string | null): EvidenceRecord {
  const executed = typeof record.data.ejecucion_acumulada_clp === "number" ? record.data.ejecucion_acumulada_clp : null;
  const directAmount = typeof record.data.monto_clp === "number" ? record.data.monto_clp : null;
  const amountClp = directAmount ?? executed;
  const original = record.data.monto_original as { ejecutado?: string; unidad?: string; moneda?: string; amount?: string; currency?: string; unit?: string } | undefined;
  const buyer = record.data.buyer as { id?: string } | null | undefined;
  const suppliers = Array.isArray(record.data.suppliers) ? record.data.suppliers as Array<{ id?: string }> : [];
  const explicitSubjectEntityIds = Array.isArray(record.data.subject_entity_ids) ? record.data.subject_entity_ids.filter((id): id is string => typeof id === "string") : [];
  const explicitObjectEntityIds = Array.isArray(record.data.object_entity_ids) ? record.data.object_entity_ids.filter((id): id is string => typeof id === "string") : [];
  const entityId = (value?: string) => value ? `chilecompra-${value.toLocaleLowerCase("es-CL").replace(/[^a-z0-9_-]/g, "-")}` : null;
  const buyerEntityId = record.sourceId === "chilecompra" ? entityId(buyer?.id) : null;
  const supplierEntityIds = record.sourceId === "chilecompra" ? suppliers.map((supplier) => entityId(supplier.id)).filter((id): id is string => Boolean(id)) : [];
  return {
    id: record.id,
    kind: record.kind === "evidence" ? "budget_execution" : record.kind,
    sourceId: record.sourceId,
    title: typeof record.data.title === "string" && record.data.title
      ? record.data.title
      : typeof record.data.denominacion === "string" && record.data.denominacion
        ? record.data.denominacion
      : `${record.kind} · ${record.id}`,
    description: typeof record.data.description === "string" ? record.data.description : null,
    occurredAt: record.occurredAt,
    period: { from: record.occurredAt, to: record.occurredAt, label: typeof record.data.period === "string" ? record.data.period : record.occurredAt?.slice(0, 7) ?? null },
    subjectEntityIds: explicitSubjectEntityIds.length > 0 ? explicitSubjectEntityIds : buyerEntityId ? [buyerEntityId] : [],
    objectEntityIds: explicitObjectEntityIds.length > 0 ? explicitObjectEntityIds : supplierEntityIds,
    amount: amountClp === null ? null : {
      amountClp,
      currency: original?.currency ?? original?.moneda ?? "CLP",
      originalAmount: original?.amount ?? original?.ejecutado ?? String(amountClp),
      originalUnit: original?.unit ?? original?.unidad ?? "CLP",
    },
    evidence: {
      sourceUrl: record.evidence?.sourceUrl ?? "",
      checksumSha256,
      retrievedAt,
      documentPage: null,
    },
    data: record.data,
  };
}

async function decompressGzip(data: Uint8Array): Promise<string> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

function cursorOffset(cursor?: string) {
  if (!cursor) return 0;
  if (!/^v1_[0-9a-z]+$/.test(cursor)) throw new Error("INVALID_CURSOR");
  return Number.parseInt(cursor.slice(3), 36);
}

export async function readR2EvidenceRecords(bucket: R2BucketLike, params: {
  source: string | string[];
  query?: string;
  entityId?: string;
  recordIds?: string[];
  kind?: EvidenceRecord["kind"];
  from?: string;
  to?: string;
  limit: number;
  cursor?: string;
}) {
  const catalogObject = await bucket.get("catalog/v1/manifest.json");
  if (!catalogObject) return null;
  const catalog = await catalogObject.json<R2PublicCatalog>();
  const sourceIds = Array.isArray(params.source) ? params.source : [params.source];
  const partitions = catalog.partitions.filter((partition) => sourceIds.includes(partition.sourceId)
    && (!params.from || partition.period >= params.from.slice(0, 7))
    && (!params.to || partition.period <= params.to.slice(0, 7)));
  const records: EvidenceRecord[] = [];
  for (const partition of partitions) {
    const [year, month] = partition.period.split("-");
    const releaseTag = partition.releaseTag ?? `data-${partition.sourceId}-${year}`;
    const manifestAssetName = `${partition.sourceId}-${year}-${month}-manifest.json`;
    const manifestObject = await readHotOrArchivedObject(bucket, partition.manifestKey, releaseTag, manifestAssetName);
    if (!manifestObject) continue;
    const manifest = await manifestObject.json<PartitionManifest>();
    const artifacts = manifest.artifacts
      .filter((artifact) => /records(?:-[^/]+)?\.jsonl\.gz(?:\.part-\d+)?$/.test(artifact.key))
      .sort((a, b) => a.key.localeCompare(b.key));
    const chunks = [];
    for (const artifact of artifacts) {
      const object = await readHotOrArchivedObject(bucket, artifact.key, releaseTag, artifact.releaseAssetName);
      if (!object) continue;
      const data = await object.arrayBuffer();
      if (await checksumSha256(data) !== artifact.checksumSha256) throw new Error(`ARCHIVE_CHECKSUM_MISMATCH: ${artifact.key}`);
      chunks.push(new Uint8Array(data));
    }
    if (chunks.length === 0) continue;
    const total = chunks.reduce((size, chunk) => size + chunk.byteLength, 0);
    const compressed = new Uint8Array(total);
    let position = 0;
    for (const chunk of chunks) { compressed.set(chunk, position); position += chunk.byteLength; }
    const text = await decompressGzip(compressed);
    for (const line of text.split("\n")) {
      if (!line) continue;
      const record = projectLakeEvidence(JSON.parse(line) as LakeRecord, manifest.projectionChecksumSha256, catalog.generatedAt);
      const date = record.occurredAt?.slice(0, 10) ?? "";
      if (params.entityId && !record.subjectEntityIds.includes(params.entityId) && !record.objectEntityIds.includes(params.entityId)) continue;
      if (params.recordIds && !params.recordIds.includes(record.id)) continue;
      if (params.kind && record.kind !== params.kind) continue;
      if (params.query) {
        const haystack = JSON.stringify({ id: record.id, title: record.title, description: record.description, data: record.data }).toLocaleLowerCase("es-CL");
        if (!haystack.includes(params.query.toLocaleLowerCase("es-CL"))) continue;
      }
      if (params.from && date < params.from) continue;
      if (params.to && date > params.to) continue;
      records.push(record);
    }
  }
  records.sort((a, b) => (b.occurredAt ?? "").localeCompare(a.occurredAt ?? "") || a.id.localeCompare(b.id));
  const offset = cursorOffset(params.cursor);
  const data = records.slice(offset, offset + params.limit);
  const next = offset + data.length;
  return { data, total: records.length, limit: params.limit, nextCursor: next < records.length ? `v1_${next.toString(36)}` : null };
}
