import type { CanonicalEntity, RelationEdge } from "@/lib/data-contracts";
import type { R2PublicCatalog } from "@/lib/r2-catalog";

export interface R2ObjectBodyLike {
  json<T>(): Promise<T>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface R2BucketLike {
  get(key: string): Promise<R2ObjectBodyLike | null>;
}

interface EntityCatalog extends R2PublicCatalog {
  sources: Array<R2PublicCatalog["sources"][number] & { entityKey?: string | null; entityIndexKey?: string | null; entityCount?: number }>;
}

export interface R2EntityIndex {
  id: string;
  sourceId: string;
  sourceIds?: string[];
  evidenceRecordIds: string[];
  relations: RelationEdge[];
}

async function decompressLines(object: R2ObjectBodyLike) {
  const bytes = new Uint8Array(await object.arrayBuffer());
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  return (await new Response(stream).text()).split("\n").filter(Boolean);
}

async function catalog(bucket: R2BucketLike) {
  const object = await bucket.get("catalog/v1/manifest.json");
  return object ? object.json<EntityCatalog>() : null;
}

const SOURCE_SPECIFIC_PREFIXES: Array<[string, string]> = [
  ["person-camara-", "camara"],
  ["senator-cl-", "senado"],
  ["servel-candidate-", "servel"],
  ["municipality-cl-", "sinim"],
  ["person-infoprobidad-", "infoprobidad"],
  ["public-body-infoprobidad-", "infoprobidad"],
  ["person-infolobby-", "infolobby"],
  ["legal-infolobby-", "infolobby"],
  ["public-body-infolobby-", "infolobby"],
  ["chilecompra-", "chilecompra"],
];

function sourceSpecificId(id: string) {
  return SOURCE_SPECIFIC_PREFIXES.find(([prefix]) => id.startsWith(prefix))?.[1] ?? null;
}

function entityKeys(value: EntityCatalog, field: "entityKey" | "entityIndexKey", ids: string[]) {
  const hints = ids.map(sourceSpecificId);
  const sources = hints.every(Boolean)
    ? value.sources.filter((source) => hints.includes(source.id))
    : value.sources;
  return sources.map((source) => source[field]).filter((key): key is string => Boolean(key));
}

async function findLines<T extends { id: string }>(bucket: R2BucketLike, keys: string[], ids: Set<string>): Promise<T[]> {
  const matches = await Promise.all(keys.map(async (key) => {
    const object = await bucket.get(key);
    if (!object) return [];
    const found = [];
    for (const line of await decompressLines(object)) {
      const value = JSON.parse(line) as T;
      if (ids.has(value.id)) found.push(value);
    }
    return found;
  }));
  return matches.flat();
}

function mergeEntities(values: CanonicalEntity[]) {
  if (values.length === 0) return null;
  const kindPriority: Record<CanonicalEntity["kind"], number> = {
    municipality: 7, public_body: 6, legal_entity: 5, political_party: 4, supplier: 2, person: 1,
  };
  const names = [...new Set(values.map((value) => value.name))].sort((a, b) => b.length - a.length || a.localeCompare(b, "es-CL"));
  const identifiers = [...new Map(values.flatMap((value) => value.identifiers).map((identifier) => [`${identifier.scheme}\u0000${identifier.value}`, identifier])).values()]
    .sort((a, b) => a.scheme.localeCompare(b.scheme) || a.value.localeCompare(b.value));
  const sourceIds = [...new Set(values.flatMap((value) => value.sourceIds))].sort();
  const updatedAt = values.map((value) => value.updatedAt).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
  const primary = [...values].sort((a, b) => kindPriority[b.kind] - kindPriority[a.kind] || b.name.length - a.name.length)[0];
  return {
    ...primary,
    name: names[0],
    identifiers,
    attributes: {
      ...primary.attributes,
      ...(names.length > 1 ? { alternate_names: names.slice(1).join("; ") } : {}),
    },
    sourceIds,
    updatedAt,
  };
}

function mergeIndexes(values: R2EntityIndex[]) {
  if (values.length === 0) return null;
  const sourceIds = [...new Set(values.flatMap((value) => value.sourceIds ?? [value.sourceId]))].sort();
  return {
    id: values[0].id,
    sourceId: sourceIds.length === 1 ? sourceIds[0] : "multiple",
    sourceIds,
    evidenceRecordIds: [...new Set(values.flatMap((value) => value.evidenceRecordIds))].sort(),
    relations: [...new Map(values.flatMap((value) => value.relations).map((relation) => [relation.id, relation])).values()]
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export async function readR2Entity(bucket: R2BucketLike, id: string) {
  return (await readR2Entities(bucket, [id]))[0] ?? null;
}

export async function readR2Entities(bucket: R2BucketLike, ids: string[]) {
  const value = await catalog(bucket);
  if (!value) return [];
  const orderedIds = [...new Set(ids)];
  const keys = entityKeys(value, "entityKey", orderedIds);
  const matches = await findLines<CanonicalEntity>(bucket, keys, new Set(orderedIds));
  return orderedIds.map((id) => mergeEntities(matches.filter((entity) => entity.id === id))).filter((entity): entity is CanonicalEntity => entity !== null);
}

export async function readR2EntityIndex(bucket: R2BucketLike, id: string) {
  const value = await catalog(bucket);
  if (!value) return null;
  const keys = entityKeys(value, "entityIndexKey", [id]);
  return mergeIndexes(await findLines<R2EntityIndex>(bucket, keys, new Set([id])));
}
