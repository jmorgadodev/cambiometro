import { createHash } from "node:crypto";
import {
  buildDeterministicPartition,
  sanitizeForPublication,
  splitDeterministically,
  stableStringify,
} from "./core.mjs";

const SOURCE_MAP = {
  congreso_opendata: "camara",
  votaciones_camara: "camara",
  asistencia_camara: "camara",
  infolobby: "infolobby",
  infoprobidad: "infoprobidad",
};

const KIND_MAP = {
  congreso_opendata: "authority",
  votaciones_camara: "vote",
  asistencia_camara: "attendance",
  infolobby: "lobby",
  infoprobidad: "declaration",
  dipres: "budget_execution",
  votaciones_senado: "vote",
  gastos_senado: "expense",
  gastos_camara: "expense",
};

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function safeId(value) {
  return String(value).split(/[\/#]/).filter(Boolean).at(-1)?.replace(/[^a-zA-Z0-9_-]/g, "-") ?? "sin-id";
}

function canonicalLegalRut(legalRut) {
  const compactRut = String(legalRut ?? "").replace(/[^0-9kK]/g, "").toLocaleLowerCase("es-CL");
  const legalId = `legal-cl-${compactRut}`;
  return validatedLegalRut(legalRut, legalId, "supplier");
}

function canonicalPartyId(value, legalRut = null) {
  const validRut = canonicalLegalRut(legalRut);
  if (validRut) return `legal-cl-${validRut.replace(/[^0-9kK]/g, "").toLocaleLowerCase("es-CL")}`;
  return `chilecompra-${String(value).toLocaleLowerCase("es-CL").replace(/[^a-z0-9_-]/g, "-")}`;
}

function entityKindFromClass(value) {
  const label = String(value ?? "").toLocaleLowerCase("es-CL");
  if (label.includes("municipalidad")) return "municipality";
  if (label.includes("ministerio") || label.includes("servicio público") || label.includes("gobierno regional") || label.includes("organismo autónomo")) return "public_body";
  return "legal_entity";
}

function camaraPerson(id, name, sourceId, sourceUrl, updatedAt) {
  if (!/^\d+$/.test(String(id ?? "")) || !String(name ?? "").trim()) return null;
  return {
    id: `person-camara-${id}`, kind: "person", name: String(name).replace(/\s+/g, " ").trim(),
    identifiers: [{ scheme: "camara-dipid", value: String(id), isPublic: true, sourceUrl }],
    attributes: { role: "Diputado/a", country: "CL" }, sourceIds: [sourceId], updatedAt,
  };
}

function camaraPublicBody(raw, sourceId, sourceUrl, updatedAt) {
  const body = raw.public_body ?? { entity_id: "public-body-camara", official_id: "camara-diputadas-diputados", name: "Cámara de Diputadas y Diputados" };
  return {
    id: body.entity_id, kind: "public_body", name: body.name,
    identifiers: [{ scheme: "organismo-publico", value: body.official_id, isPublic: true, sourceUrl }],
    attributes: { country: "CL" }, sourceIds: [sourceId], updatedAt,
  };
}

const ENTITY_KINDS = new Set(["person", "public_body", "municipality", "party", "legal_entity", "supplier"]);

function validatedLegalRut(value, entityId, kind) {
  if (kind !== "legal_entity" && kind !== "supplier") return null;
  const compact = String(value ?? "").replace(/[^0-9kK]/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(compact) || entityId !== `legal-cl-${compact.toLocaleLowerCase("es-CL")}`) return null;
  const body = compact.slice(0, -1);
  let factor = 2;
  let sum = 0;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  return expected === compact.at(-1) ? String(value) : null;
}

function connectorEntity(rawEntity, sourceId, sourceUrl, updatedAt) {
  if (!rawEntity || typeof rawEntity !== "object") return null;
  const id = String(rawEntity.id ?? "").trim();
  const name = String(rawEntity.name ?? "").replace(/\s+/g, " ").trim();
  const kind = String(rawEntity.kind ?? "");
  if (!/^[a-z0-9][a-z0-9_-]{2,199}$/.test(id) || !name || !ENTITY_KINDS.has(kind)) return null;
  const legalRut = validatedLegalRut(rawEntity.rut_juridico, id, kind);
  const identifiers = (Array.isArray(rawEntity.identifiers) ? rawEntity.identifiers : []).filter((identifier) => (
    identifier && typeof identifier === "object" && String(identifier.scheme ?? "").trim()
      && String(identifier.value ?? "").trim()
  )).map((identifier) => {
    const scheme = String(identifier.scheme).trim();
    const value = scheme === "CL-RUT" && legalRut === String(identifier.value).trim()
      ? legalRut : sanitizeForPublication(String(identifier.value).trim());
    return { scheme, value, isPublic: identifier.isPublic === true, sourceUrl: identifier.sourceUrl ?? sourceUrl };
  }).filter((identifier) => identifier.value);
  if (legalRut && !identifiers.some((identifier) => identifier.scheme === "CL-RUT")) {
    identifiers.push({ scheme: "CL-RUT", value: legalRut, isPublic: true, sourceUrl });
  }
  return {
    id, kind, name, identifiers,
    ...(legalRut ? { rut_juridico: legalRut } : {}),
    attributes: sanitizeForPublication(rawEntity.attributes ?? {}),
    sourceIds: [sourceId], updatedAt,
  };
}

function collectEntities(sourceId, sourceKey, raw, sourceUrl, updatedAt) {
  const found = [];
  const add = (entity) => {
    if (!entity?.id || !entity?.name) return;
    found.push({
      ...entity,
      name: sanitizeForPublication(entity.name),
      identifiers: entity.identifiers.map((identifier) => ({
        ...identifier,
        sourceUrl: sanitizeForPublication(identifier.sourceUrl),
      })),
    });
  };
  for (const entity of raw.entities ?? []) add(connectorEntity(entity, sourceId, sourceUrl, updatedAt));
  if (raw.municipality_code && raw.municipality_name) add({
    id: `municipality-cl-${raw.municipality_code}`, kind: "municipality", name: raw.municipality_name,
    identifiers: [{ scheme: "codigo-territorial", value: raw.municipality_code, isPublic: true, sourceUrl }],
    attributes: { country: "CL" }, sourceIds: [sourceId], updatedAt,
  });
  for (const party of [raw.emitter, raw.receiver]) {
    if (!party?.entity_id) continue;
    add({
      id: party.entity_id, kind: entityKindFromClass(party.class), name: party.name,
      identifiers: party.rut_juridico ? [{ scheme: "CL-RUT", value: party.rut_juridico, isPublic: true, sourceUrl }] : [],
      attributes: { class: party.class ?? null, country: "CL" }, sourceIds: [sourceId], updatedAt,
    });
  }
  if (raw.person?.entity_id && raw.person?.official_id && raw.person?.name) add({
    id: raw.person.entity_id, kind: "person", name: raw.person.name,
    identifiers: [{ scheme: "senado-unidad-ejecutora", value: raw.person.official_id, isPublic: true, sourceUrl }],
    attributes: { role: raw.person.role ?? null, country: "CL" }, sourceIds: [sourceId], updatedAt,
  });
  if (raw.candidate?.entity_id && raw.candidate?.official_id && raw.candidate?.name) add({
    id: raw.candidate.entity_id, kind: "person", name: raw.candidate.name,
    identifiers: [{ scheme: "servel-candidate-code", value: raw.candidate.official_id, isPublic: true, sourceUrl }],
    attributes: { role: raw.candidate.role ?? "Candidato/a", country: "CL" }, sourceIds: [sourceId], updatedAt,
  });
  if (sourceId === "camara") {
    add(camaraPublicBody(raw, sourceId, sourceUrl, updatedAt));
    if (raw.deputy?.official_id && raw.deputy?.name) add(camaraPerson(raw.deputy.official_id, raw.deputy.name, sourceId, sourceUrl, updatedAt));
    if (sourceKey === "congreso_opendata") add(camaraPerson(raw.id, raw.nombre, sourceId, sourceUrl, updatedAt));
    for (const vote of raw.votos ?? []) add(camaraPerson(vote.id, vote.nombre, sourceId, sourceUrl, updatedAt));
  }
  if (sourceKey === "votaciones_senado") {
    add({ id: "public-body-senado", kind: "public_body", name: "Senado de la República", identifiers: [], attributes: { country: "CL" }, sourceIds: [sourceId], updatedAt });
    for (const vote of raw.votos ?? []) if (vote?.id && vote?.nombre) add({
      id: `person-senado-${vote.id}`, kind: "person", name: vote.nombre,
      identifiers: [{ scheme: "senado-id", value: String(vote.id), isPublic: true, sourceUrl }],
      attributes: { role: "Senador/a", country: "CL" }, sourceIds: [sourceId], updatedAt,
    });
  }
  if (sourceKey === "gastos_senado") add({ id: "public-body-senado", kind: "public_body", name: "Senado de la República", identifiers: [], attributes: { country: "CL" }, sourceIds: [sourceId], updatedAt });
  if (sourceKey === "gastos_camara") add({ id: "public-body-camara", kind: "public_body", name: "Cámara de Diputadas y Diputados", identifiers: [], attributes: { country: "CL" }, sourceIds: [sourceId], updatedAt });
  if (raw.buyer?.id) add({
    id: canonicalPartyId(raw.buyer.id, raw.buyer.rut_juridico), kind: "public_body", name: raw.buyer.legal_name || raw.buyer.name,
    identifiers: [
      { scheme: "CL-MP", value: raw.buyer.id, isPublic: true, sourceUrl },
      ...(canonicalLegalRut(raw.buyer.rut_juridico) ? [{ scheme: "CL-RUT", value: canonicalLegalRut(raw.buyer.rut_juridico), isPublic: true, sourceUrl }] : []),
    ], ...(canonicalLegalRut(raw.buyer.rut_juridico) ? { rut_juridico: canonicalLegalRut(raw.buyer.rut_juridico) } : {}),
    attributes: { country: "CL" }, sourceIds: [sourceId], updatedAt,
  });
  for (const supplier of raw.suppliers ?? []) if (supplier?.id) add({
    id: canonicalPartyId(supplier.id, supplier.rut_juridico), kind: "supplier", name: supplier.legal_name || supplier.name,
    identifiers: [
      { scheme: "CL-MP", value: supplier.id, isPublic: true, sourceUrl },
      ...(canonicalLegalRut(supplier.rut_juridico) ? [{ scheme: "CL-RUT", value: canonicalLegalRut(supplier.rut_juridico), isPublic: true, sourceUrl }] : []),
    ], ...(canonicalLegalRut(supplier.rut_juridico) ? { rut_juridico: canonicalLegalRut(supplier.rut_juridico) } : {}),
    attributes: { country: "CL" }, sourceIds: [sourceId], updatedAt,
  });
  return found;
}

function upsertDeterministicEntity(entities, entity) {
  const previous = entities.get(entity.id);
  if (!previous) {
    entities.set(entity.id, entity);
    return;
  }
  const previousDate = String(previous.updatedAt ?? "");
  const candidateDate = String(entity.updatedAt ?? "");
  if (candidateDate > previousDate || (candidateDate === previousDate && stableStringify(entity) > stableStringify(previous))) {
    entities.set(entity.id, entity);
  }
}

function rawEntityIds(sourceId, sourceKey, raw) {
  const subjects = Array.isArray(raw.subject_entity_ids) ? [...raw.subject_entity_ids] : [];
  const objects = Array.isArray(raw.object_entity_ids) ? [...raw.object_entity_ids] : [];
  if (sourceId === "camara") {
    if (subjects.length === 0 && raw.deputy?.official_id) subjects.push(`person-camara-${raw.deputy.official_id}`);
    if (subjects.length === 0 && sourceKey === "congreso_opendata" && raw.id) subjects.push(`person-camara-${raw.id}`);
    if (subjects.length === 0) for (const vote of raw.votos ?? []) if (vote?.id) subjects.push(`person-camara-${vote.id}`);
    if (objects.length === 0) objects.push("public-body-camara");
  }
  if (subjects.length === 0 && sourceKey === "gastos_camara" && raw.diputado_id) {
    subjects.push(`person-camara-${raw.diputado_id}`);
  }
  if (sourceKey === "votaciones_senado") {
    if (subjects.length === 0) for (const vote of raw.votos ?? []) if (vote?.id) subjects.push(`person-senado-${vote.id}`);
    if (objects.length === 0) objects.push("public-body-senado");
  }
  if (sourceKey === "gastos_senado" && objects.length === 0) objects.push("public-body-senado");
  if (sourceKey === "gastos_camara" && objects.length === 0) objects.push("public-body-camara");
  if (subjects.length === 0 && raw.buyer?.id) subjects.push(canonicalPartyId(raw.buyer.id, raw.buyer.rut_juridico));
  if (objects.length === 0) for (const supplier of raw.suppliers ?? []) if (supplier?.id) objects.push(canonicalPartyId(supplier.id, supplier.rut_juridico));
  return { subjects, objects };
}

function asset(key, data, releaseTag, releaseAssetName) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");
  return { key, data: buffer, checksumSha256: sha256(buffer), size: buffer.length, releaseTag, releaseAssetName };
}

function normalizeRecord(sourceKey, sourceId, raw) {
  return sanitizeForPublication({
    id: `${sourceId}-${safeId(raw.id)}`,
    sourceId,
    kind: raw.kind ?? KIND_MAP[sourceKey] ?? "evidence",
    occurredAt: raw.fecha ?? null,
    evidence: { sourceUrl: raw.url ?? null },
    data: raw,
  });
}

function relationPredicate(normalized, raw) {
  if (normalized.kind === "transfer") return "transferred_to";
  if (normalized.kind === "contract" || normalized.kind === "purchase") return "contracted_with";
  if (normalized.kind === "attendance") return "has_attendance_record";
  if (normalized.kind === "vote") return "has_vote_record";
  if (normalized.kind === "lobby" && raw.lobby_event_kind === "audience") return "documented_lobby_contact";
  if (normalized.kind === "lobby" && raw.lobby_event_kind === "travel") return "reported_official_travel";
  if (normalized.kind === "lobby" && raw.lobby_event_kind === "gift") return "reported_gift";
  return "has_evidence";
}

function relationEdges(normalized, raw, subjects, objects) {
  const custom = Array.isArray(raw.relations) ? raw.relations : [];
  if (custom.length === 0) {
    const predicate = relationPredicate(normalized, raw);
    return subjects.flatMap((fromId) => objects.filter((toId) => toId !== fromId).map((toId) => ({ fromId, predicate, toId, method: "official_id", custom: false })));
  }
  return custom.map((relation) => {
    const fromId = String(relation?.fromId ?? "");
    const toId = String(relation?.toId ?? "");
    const predicate = String(relation?.predicate ?? "");
    const method = String(relation?.method ?? "official_id");
    if (!subjects.includes(fromId) || !objects.includes(toId) || fromId === toId
      || !/^[a-z][a-z0-9_]{2,64}$/.test(predicate) || !/^[a-z][a-z0-9_]{2,64}$/.test(method)) {
      throw new Error(`INVALID_RELATION_DESCRIPTOR: ${normalized.id}`);
    }
    return { fromId, predicate, toId, method, custom: true };
  });
}

export function buildLakePlan(snapshot, options = {}) {
  const maxPartBytes = options.maxPartBytes ?? 1_900_000_000;
  const sourceInventory = options.sourceInventory ?? null;
  const sourceMetadata = options.sourceMetadata ?? {};
  const originalAssets = options.originalAssets ?? [];
  const existingCatalog = options.existingCatalog ?? null;
  const existingEntityBundles = options.existingEntityBundles ?? {};
  const replaceSourceIds = new Set(options.replaceSourceIds ?? []);
  const fallbackDate = new Date(snapshot.actualizado_en ?? "1970-01-01T00:00:00.000Z");
  if (Number.isNaN(fallbackDate.getTime())) throw new Error("INVALID_SNAPSHOT_DATE");
  const groups = new Map();
  const entityBundles = new Map();
  const recordIds = new Set();

  for (const [sourceKey, rawRecords] of Object.entries(snapshot.fuentes ?? {})) {
    const sourceId = SOURCE_MAP[sourceKey] ?? sourceKey;
    for (const raw of rawRecords) {
      if (raw.source_period != null && !/^\d{4}-\d{2}$/.test(String(raw.source_period))) throw new Error(`INVALID_SOURCE_PERIOD: ${sourceId}`);
      const date = new Date(raw.source_period ? `${raw.source_period}-01T00:00:00.000Z` : (raw.fecha ?? fallbackDate));
      const year = String(date.getUTCFullYear()).padStart(4, "0");
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const id = `${sourceId}/${year}/${month}`;
      const sourcePeriod = raw.source_period ? String(raw.source_period) : null;
      const group = groups.get(id) ?? { id, sourceId, year, month, sourcePeriod, records: [] };
      if (group.sourcePeriod !== sourcePeriod) throw new Error(`MIXED_SOURCE_PERIOD: ${id}`);
      const normalized = normalizeRecord(sourceKey, sourceId, raw);
      if (recordIds.has(normalized.id)) throw new Error(`DUPLICATE_SOURCE_RECORD_ID: ${sourceId}:${raw.id}`);
      recordIds.add(normalized.id);
      group.records.push(normalized);
      groups.set(id, group);
      let bundle = entityBundles.get(sourceId);
      if (!bundle) {
        const seed = existingEntityBundles[sourceId] ?? {};
        const entities = new Map();
        for (const entity of seed.entities ?? []) upsertDeterministicEntity(entities, entity);
        const indexes = new Map((seed.indexes ?? []).map((entry) => [entry.id, {
          ...entry,
          evidenceRecordIds: [...(entry.evidenceRecordIds ?? [])],
          relations: [...(entry.relations ?? [])],
        }]));
        bundle = { entities, indexes, years: new Set(seed.years ?? []) };
      }
      const sourceUrl = raw.url ?? "";
      const entityUpdatedAt = raw.fecha ?? (raw.source_period ? `${raw.source_period}-01` : null);
      for (const entity of collectEntities(sourceId, sourceKey, raw, sourceUrl, entityUpdatedAt)) upsertDeterministicEntity(bundle.entities, entity);
      const { subjects, objects } = rawEntityIds(sourceId, sourceKey, raw);
      normalized.data.subject_entity_ids = subjects;
      normalized.data.object_entity_ids = objects;
      const edges = relationEdges(normalized, raw, subjects, objects).map(({ fromId, predicate, toId, method, custom }) => ({
        id: `relation-${safeId(normalized.id)}-${custom ? `${safeId(predicate)}-` : ""}${safeId(fromId)}-${safeId(toId)}`,
        fromId, predicate, toId, evidenceRecordIds: [normalized.id],
        period: { from: normalized.occurredAt, to: normalized.occurredAt },
        reconciliation: { method, confidence: 1 },
        disclaimer: "La relación documental no implica irregularidad ni responsabilidad.",
      }));
      for (const entityId of new Set([...subjects, ...objects])) {
        const index = bundle.indexes.get(entityId) ?? { id: entityId, sourceId, evidenceRecordIds: [], relations: [] };
        index.evidenceRecordIds.push(normalized.id);
        index.relations.push(...edges.filter((edge) => edge.fromId === entityId || edge.toId === entityId));
        bundle.indexes.set(entityId, index);
      }
      bundle.years.add(year);
      entityBundles.set(sourceId, bundle);
    }
  }

  const assets = [];
  const partitions = [];
  for (const group of [...groups.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    const prefix = `partitions/${group.sourceId}/${group.year}/${group.month}`;
    const projection = buildDeterministicPartition(group.records);
    const parts = splitDeterministically(projection.compressed, maxPartBytes);
    const projectionAssets = parts.map((part, index) => {
      const releaseSuffix = parts.length === 1 ? "records.jsonl.gz" : `records.jsonl.gz.part-${String(index + 1).padStart(4, "0")}`;
      const keySuffix = parts.length === 1
        ? `records-${projection.checksumSha256}.jsonl.gz`
        : `records-${projection.checksumSha256}.jsonl.gz.part-${String(index + 1).padStart(4, "0")}`;
      return asset(`${prefix}/${keySuffix}`, part, "", `${group.sourceId}-${group.year}-${group.month}-${releaseSuffix}`);
    });
    assets.push(...projectionAssets);

    const originals = originalAssets.filter((item) => item.sourceId === group.sourceId
      && Number(item.year) === Number(group.year) && Number(item.month) === Number(group.month));
    const originalReleaseAssets = [];
    const archivedOriginals = originals.filter((item) => item.redistributable && item.data).map((item) => {
      const key = `originals/${group.sourceId}/${group.year}/${group.month}/${item.name}`;
      const originalAsset = asset(key, item.data, "", `${group.sourceId}-${group.year}-${group.month}-original-${item.name}`);
      originalReleaseAssets.push(originalAsset);
      assets.push(originalAsset);
      return { name: item.name, sourceUrl: item.url, license: item.license, archived: true, key, checksumSha256: originalAsset.checksumSha256, size: originalAsset.size };
    });
    const metadataOnlyOriginals = originals.filter((item) => !item.redistributable || !item.data).map((item) => ({
      name: item.name, sourceUrl: item.url, license: item.license, archived: false,
      checksumSha256: item.checksumSha256 ?? null, size: item.size ?? null,
    }));

    const manifest = {
      schemaVersion: "1.0.0",
      id: group.id,
      sourceId: group.sourceId,
      year: Number(group.year),
      month: Number(group.month),
      sourcePeriod: group.sourcePeriod,
      status: "partial",
      recordCount: group.records.length,
      generatedAt: snapshot.actualizado_en ?? null,
      projectionChecksumSha256: projection.checksumSha256,
      projectionUncompressedChecksumSha256: projection.uncompressedChecksumSha256,
      original: originals.length > 0
        ? { archived: archivedOriginals.length > 0 && metadataOnlyOriginals.length === 0, artifacts: [...archivedOriginals, ...metadataOnlyOriginals] }
        : { archived: false, policy: "metadata_only_until_license_verified" },
      artifacts: projectionAssets.map(({ key, checksumSha256, size, releaseAssetName }) => ({ key, checksumSha256, size, releaseAssetName })),
    };
    const manifestText = `${stableStringify(manifest)}\n`;
    const releaseTag = `data-${group.sourceId}-${group.year}-${sha256(manifestText).slice(0, 16)}`;
    for (const releaseAsset of [...projectionAssets, ...originalReleaseAssets]) releaseAsset.releaseTag = releaseTag;
    const manifestAsset = asset(`${prefix}/manifest.json`, manifestText, releaseTag, `${group.sourceId}-${group.year}-${group.month}-manifest.json`);
    const checksumText = `${[...projectionAssets, manifestAsset].map((item) => `${item.checksumSha256}  ${item.key.split("/").at(-1)}`).join("\n")}\n`;
    assets.push(manifestAsset, asset(`${prefix}/sha256.txt`, checksumText, releaseTag, `${group.sourceId}-${group.year}-${group.month}-sha256.txt`));
    partitions.push({
      id: group.id,
      sourceId: group.sourceId,
      period: `${group.year}-${group.month}`,
      sourcePeriod: group.sourcePeriod,
      releaseTag,
      manifestKey: manifestAsset.key,
      recordCount: group.records.length,
      checksumSha256: projection.checksumSha256,
      status: "partial",
    });
  }

  const entityMetadata = new Map();
  for (const [sourceId, bundle] of entityBundles) {
    if (bundle.entities.size === 0) continue;
    const releaseYear = [...bundle.years].sort().at(-1) ?? String(fallbackDate.getUTCFullYear());
    const entityProjection = buildDeterministicPartition([...bundle.entities.values()]);
    const indexProjection = buildDeterministicPartition([...bundle.indexes.values()].map((entry) => ({
      ...entry,
      evidenceRecordIds: [...new Set(entry.evidenceRecordIds)].sort(),
      relations: [...new Map(entry.relations.map((relation) => [relation.id, relation])).values()].sort((a, b) => a.id.localeCompare(b.id)),
    })));
    const releaseChecksum = sha256(`${entityProjection.checksumSha256}:${indexProjection.checksumSha256}`);
    const releaseTag = `data-${sourceId}-${releaseYear}-${releaseChecksum.slice(0, 16)}`;
    const entityKey = `entities/v1/${sourceId}-${entityProjection.checksumSha256}.jsonl.gz`;
    const entityIndexKey = `indexes/v1/${sourceId}/entities-${indexProjection.checksumSha256}.jsonl.gz`;
    assets.push(asset(entityKey, entityProjection.compressed, releaseTag, `${sourceId}-${releaseYear}-entities.jsonl.gz`));
    assets.push(asset(entityIndexKey, indexProjection.compressed, releaseTag, `${sourceId}-${releaseYear}-entity-index.jsonl.gz`));
    entityMetadata.set(sourceId, { entityKey, entityIndexKey, entityCount: bundle.entities.size });
  }

  const producedPartitionIds = new Set(partitions.map((partition) => partition.id));
  const explicitPeriodsBySource = new Map();
  for (const partition of partitions) if (partition.sourcePeriod) {
    const periods = explicitPeriodsBySource.get(partition.sourceId) ?? new Set();
    periods.add(partition.sourcePeriod);
    explicitPeriodsBySource.set(partition.sourceId, periods);
  }
  const retainedPartitions = (existingCatalog?.partitions ?? []).filter((partition) => {
    if (replaceSourceIds.has(partition.sourceId)) return false;
    if (producedPartitionIds.has(partition.id)) return false;
    const explicitPeriods = explicitPeriodsBySource.get(partition.sourceId);
    if (!explicitPeriods) return true;
    if (!partition.sourcePeriod) return false;
    return !explicitPeriods.has(partition.sourcePeriod);
  });
  const allPartitions = [...retainedPartitions, ...partitions].sort((a, b) => a.id.localeCompare(b.id));
  const inventoryById = new Map((sourceInventory?.sources ?? []).map((source) => [source.id, source]));
  const updatedSourceIds = new Set([...groups.values()].map((group) => group.sourceId));
  const sourceIds = [...new Set([
    ...allPartitions.map((partition) => partition.sourceId),
    ...inventoryById.keys(),
    ...(existingCatalog?.sources ?? []).map((source) => source.id),
  ])].sort();
  for (const sourceId of inventoryById.keys()) {
    const source = inventoryById.get(sourceId);
    const metadata = sourceMetadata[sourceId] ?? {};
    const previousSource = (existingCatalog?.sources ?? []).find((item) => item.id === sourceId);
    if (updatedSourceIds.size > 0 && previousSource && !updatedSourceIds.has(sourceId)) continue;
    const sourcePartitions = allPartitions.filter((partition) => partition.sourceId === sourceId);
    const partitionPeriods = sourcePartitions.map((partition) => partition.period);
    const foundPeriods = [...new Set([...partitionPeriods, ...(source.periods ?? []), ...(previousSource?.foundPeriods ?? [])])].sort();
    const entity = entityMetadata.get(sourceId);
    const currentRecords = [...groups.values()].filter((group) => group.sourceId === sourceId).flatMap((group) => group.records);
    const status = partitionPeriods.length > 0 ? "partial" : (source.status ?? previousSource?.status ?? "unavailable");
    const year = sourcePartitions.map((partition) => partition.period.slice(0, 4)).sort().at(-1)
      ?? String(new Date(sourceInventory.generatedAt ?? snapshot.actualizado_en ?? 0).getUTCFullYear());
    const sourceManifest = {
      schemaVersion: "1.0.0",
      sourceId,
      status,
      indexUrl: source.indexUrl ?? null,
      indexChecksumSha256: source.indexChecksumSha256 ?? null,
      foundPeriods,
      discoveredAssets: source.assets ?? [],
      partitionCount: sourcePartitions.length,
      recordCount: sourcePartitions.reduce((total, partition) => total + partition.recordCount, 0),
      recordErrorCount: currentRecords.filter((record) => record.data?.document_error).length,
      entityCount: entity?.entityCount ?? previousSource?.entityCount ?? 0,
      entityKey: entity?.entityKey ?? previousSource?.entityKey ?? null,
      entityIndexKey: entity?.entityIndexKey ?? previousSource?.entityIndexKey ?? null,
      partitions: sourcePartitions.map((partition) => ({
        id: partition.id, period: partition.period, sourcePeriod: partition.sourcePeriod ?? null,
        recordCount: partition.recordCount, checksumSha256: partition.checksumSha256, status: partition.status,
      })),
      error: source.error ?? null,
      generatedAt: snapshot.actualizado_en ?? null,
      inventoryGeneratedAt: sourceInventory.generatedAt ?? null,
      coverage: metadata.coverage ?? null,
      license: metadata.license ?? null,
      notes: metadata.notes ?? null,
    };
    const sourceManifestText = `${stableStringify(sourceManifest)}\n`;
    assets.push(asset(`sources/${sourceId}/manifest.json`, sourceManifestText, `data-${sourceId}-${year}-manifest-${sha256(sourceManifestText).slice(0, 16)}`, `${sourceId}-${year}-source-manifest.json`));
  }
  const catalog = {
    schemaVersion: "1.0.0",
    generatedAt: snapshot.actualizado_en ?? null,
    sources: sourceIds.map((sourceId) => {
      const inventory = inventoryById.get(sourceId);
      const previousSource = (existingCatalog?.sources ?? []).find((source) => source.id === sourceId);
      const entity = entityMetadata.get(sourceId);
      const partitionPeriods = allPartitions.filter((partition) => partition.sourceId === sourceId).map((partition) => partition.period);
      return {
        id: sourceId,
        status: partitionPeriods.length > 0 ? "partial" : (inventory?.status ?? previousSource?.status ?? "unavailable"),
        foundPeriods: [...new Set([...partitionPeriods, ...(inventory?.periods ?? []), ...(previousSource?.foundPeriods ?? [])])].sort(),
        recordCount: allPartitions.filter((partition) => partition.sourceId === sourceId).reduce((total, partition) => total + partition.recordCount, 0),
        discoveredAssetCount: inventory?.assetCount ?? previousSource?.discoveredAssetCount ?? 0,
        indexChecksumSha256: inventory?.indexChecksumSha256 ?? previousSource?.indexChecksumSha256 ?? null,
        error: inventory?.error ?? previousSource?.error ?? null,
        entityKey: entity?.entityKey ?? previousSource?.entityKey ?? null,
        entityIndexKey: entity?.entityIndexKey ?? previousSource?.entityIndexKey ?? null,
        entityCount: entity?.entityCount ?? previousSource?.entityCount ?? 0,
      };
    }),
    partitions: allPartitions,
  };
  const catalogText = `${stableStringify(catalog)}\n`;
  assets.push(asset("catalog/v1/manifest.json", catalogText, `data-catalog-v1-${sha256(catalogText).slice(0, 16)}`, "manifest.json"));
  return { catalog, assets };
}
