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
  get(key: string, options?: { range?: { offset: number; length: number } }): Promise<R2ObjectBodyLike | null>;
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

interface IndexedRecordsManifest {
  schemaVersion: number;
  sourceId: string;
  totalRows: number;
  pageSize: number;
  recordArchiveKey: string;
  pages: Array<{ offset: number; length: number }>;
  searchIndexKey?: string;
  searchCountIndexKey?: string;
}

function searchTerms(query: string) {
  return [...new Set(query.toLocaleLowerCase("es-CL").match(/[\p{L}\p{N}]{3,}/gu) ?? [])];
}

function indexedRecordMatches(record: EvidenceRecord, params: {
  entityId?: string;
  recordIds?: string[];
  kind?: EvidenceRecord["kind"];
  from?: string;
  to?: string;
  query?: string;
}) {
  const date = record.occurredAt?.slice(0, 10) ?? "";
  if (params.entityId && !record.subjectEntityIds.includes(params.entityId) && !record.objectEntityIds.includes(params.entityId)) return false;
  if (params.recordIds && !params.recordIds.includes(record.id)) return false;
  if (params.kind && record.kind !== params.kind) return false;
  if (params.from && date < params.from) return false;
  if (params.to && date > params.to) return false;
  if (params.query) {
    const haystack = JSON.stringify({ id: record.id, title: record.title, description: record.description, data: record.data }).toLocaleLowerCase("es-CL");
    if (!haystack.includes(params.query.toLocaleLowerCase("es-CL"))) return false;
  }
  return true;
}

async function readIndexedRecords(bucket: R2BucketLike, params: Parameters<typeof readR2EvidenceRecords>[1]) {
  const sourceIds = Array.isArray(params.source) ? params.source : [params.source];
  if (sourceIds.length !== 1 || !["chilecompra", "infolobby"].includes(sourceIds[0])) return null;
  const sourceId = sourceIds[0];
  const manifestObject = await bucket.get(`indexes/v1/${sourceId}/manifest.json`);
  if (!manifestObject) return null;
  const manifest = await manifestObject.json<IndexedRecordsManifest>();
  if (manifest.schemaVersion !== 1 || manifest.sourceId !== sourceId || !Array.isArray(manifest.pages)) return null;
  const offset = cursorOffset(params.cursor);
  const limit = Math.min(Math.max(params.limit, 1), 100);
  const hasFilters = Boolean(params.query?.trim() || params.entityId || params.recordIds || params.kind || params.from || params.to);
  let candidatePages = manifest.pages.map((_, index) => index);
  const query = params.query?.trim();
  let indexedQueryTotal: number | null = null;
  if (query && manifest.searchIndexKey) {
    const searchObject = await bucket.get(manifest.searchIndexKey);
    if (!searchObject) return null;
    const index = await searchObject.json<Record<string, number[]>>();
    const terms = searchTerms(query);
    if (terms.length > 0) {
      if (terms.length === 1 && manifest.searchCountIndexKey && !params.entityId && !params.recordIds && !params.kind && !params.from && !params.to) {
        const countObject = await bucket.get(manifest.searchCountIndexKey);
        if (countObject) {
          const counts = await countObject.json<Record<string, number>>();
          indexedQueryTotal = counts[terms[0]] ?? 0;
        }
      }
      const pageSets = terms.map((term) => new Set(index[term] ?? []));
      if (pageSets.some((pages) => pages.size === 0)) return { data: [], total: 0, limit, nextCursor: null };
      candidatePages = [...pageSets[0]].filter((page) => pageSets.every((pages) => pages.has(page))).sort((a, b) => a - b);
    }
  }
  if (!hasFilters) {
    const pageIndex = Math.floor(offset / manifest.pageSize);
    candidatePages = pageIndex < manifest.pages.length ? [pageIndex] : [];
  }

  const selected: EvidenceRecord[] = [];
  let total = 0;
  let exhausted = false;
  for (let index = 0; index < candidatePages.length && !exhausted;) {
    const firstPageIndex = candidatePages[index];
    let lastPageIndex = firstPageIndex;
    while (index + 1 < candidatePages.length
      && candidatePages[index + 1] === lastPageIndex + 1
      && manifest.pages[candidatePages[index + 1]].offset + manifest.pages[candidatePages[index + 1]].length - manifest.pages[firstPageIndex].offset <= 1_000_000) {
      index += 1;
      lastPageIndex = candidatePages[index];
    }
    const firstPage = manifest.pages[firstPageIndex];
    const lastPage = manifest.pages[lastPageIndex];
    const object = await bucket.get(manifest.recordArchiveKey, {
      range: { offset: firstPage.offset, length: lastPage.offset + lastPage.length - firstPage.offset },
    });
    if (!object) return null;
    const pageText = new TextDecoder().decode(await object.arrayBuffer());
    for (const line of pageText.split("\n")) {
      if (!line) continue;
      const lakeRecord = JSON.parse(line) as LakeRecord;
      const record = projectLakeEvidence(lakeRecord, null, null);
      if (!indexedRecordMatches(record, params)) continue;
      if (total >= offset && selected.length < limit) selected.push(record);
      total += 1;
      if (indexedQueryTotal !== null && selected.length >= limit && total >= offset + limit) {
        exhausted = true;
        break;
      }
    }
    index += 1;
  }
  const resultTotal = indexedQueryTotal ?? (hasFilters ? total : manifest.totalRows);
  return {
    data: selected,
    total: resultTotal,
    limit,
    nextCursor: offset + selected.length < resultTotal
      ? `v1_${(offset + selected.length).toString(36)}`
      : null,
  };
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
  const indexed = await readIndexedRecords(bucket, params);
  if (indexed) return indexed;
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
