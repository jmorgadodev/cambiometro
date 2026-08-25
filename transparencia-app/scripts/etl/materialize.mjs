import { createHash } from "node:crypto";

function array(value) {
  return Array.isArray(value) ? value : [];
}

function compactData(value) {
  const data = value && typeof value === "object" ? { ...value } : {};
  for (const key of ["items", "documents", "votos", "source_workbooks"]) {
    if (Array.isArray(data[key])) data[`${key}_count`] = data[key].length;
  }
  for (const key of [
    "declaracion", "entities", "relations", "items", "documents", "votos", "source_workbooks",
    "subject_entity_ids", "object_entity_ids", "title", "description", "url", "fuente", "fecha", "id", "kind",
    "monto_clp", "monto_original", "ejecucion_acumulada_clp", "buyer", "suppliers",
  ]) {
    delete data[key];
  }
  return data;
}

function canonicalAmount(record, data) {
  if (record.amount != null) return record.amount;
  if (data.amount != null) return data.amount;
  const clp = data.monto_clp ?? data.ejecucion_acumulada_clp;
  return typeof clp === "number" && Number.isFinite(clp)
    ? { value: clp, currency: "CLP", unit: "pesos" }
    : null;
}

function text(value) {
  const normalized = value == null ? "" : String(value).trim();
  return normalized || null;
}

function integer(value) {
  const normalized = typeof value === "string" ? value.replace(/\./g, "").replace(/,/g, ".") : value;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * Maps the official lake shape to the query-optimized D1 transfer table.
 * Returning null is intentional: incomplete source rows must not become
 * plausible-looking records in the public API.
 */
export function transferenciaFromLakeRecord(record) {
  if (!record?.id || record.sourceId !== "ley-19862") return null;
  const data = record.data && typeof record.data === "object" ? record.data : {};
  const emitter = data.emitter && typeof data.emitter === "object" ? data.emitter : {};
  const receiver = data.receiver && typeof data.receiver === "object" ? data.receiver : {};
  const id = text(data.id ?? record.id);
  const fecha = text(data.fecha ?? record.occurredAt);
  const periodo = text(data.period ?? data.PERIODO ?? data.budget_period ?? (fecha ? fecha.slice(0, 4) : null));
  const emisorNombre = text(emitter.name ?? data.emitter_name);
  const receptorNombre = text(receiver.name ?? data.receiver_name);
  const materia = text(data.title ?? record.title ?? data.objective);
  const montoClp = integer(data.monto_clp ?? data.amount ?? record.amount?.value);
  const folio = text(data.folio);
  const urlRegistro = text(data.url ?? data.report_url)
    ?? (folio ? `https://registros19862.gob.cl/transferencia/${encodeURIComponent(folio)}` : null);

  if (!id || !fecha || !periodo || !emisorNombre || !receptorNombre || !materia || montoClp === null || !urlRegistro) {
    return null;
  }

  return {
    id,
    folio,
    fecha,
    periodo,
    emisorNombre,
    emisorRut: text(emitter.rut_juridico ?? data.emitter_rut),
    receptorNombre,
    receptorRut: text(receiver.rut_juridico ?? data.receiver_rut),
    materia,
    montoClp,
    urlRegistro,
    clasificacion: text(data.classification ?? data.clasificacion),
    comuna: text(data.municipality ?? data.comuna),
  };
}

export const D1_ARCHIVE_ONLY_SOURCES = new Set(["servel"]);

export function selectMaterializedPartitions(partitions, { includeAllHistory = false } = {}) {
  if (includeAllHistory) return [...partitions];
  const latestDipresPeriod = partitions
    .filter((partition) => partition?.sourceId === "dipres")
    .map((partition) => String(partition.period ?? ""))
    .sort()
    .at(-1);
  return partitions.filter((partition) => !D1_ARCHIVE_ONLY_SOURCES.has(partition?.sourceId)
    && (partition?.sourceId !== "dipres" || partition.period === latestDipresPeriod));
}

export function canonicalizeLakeRecord(record) {
  if (!record?.id || !record?.sourceId || !record?.kind) throw new Error("D1_INVALID_LAKE_RECORD");
  const data = record.data && typeof record.data === "object" ? record.data : {};
  const occurredAt = record.occurredAt ?? data.fecha ?? null;
  const period = occurredAt
    ? { from: occurredAt, to: occurredAt, label: String(occurredAt).slice(0, 7) }
    : {};
  return {
    id: String(record.id),
    kind: String(record.kind),
    sourceId: String(record.sourceId),
    title: String(data.title ?? record.title ?? record.id),
    description: data.description ?? record.description ?? null,
    occurredAt,
    period,
    subjectEntityIds: array(data.subject_entity_ids ?? record.subjectEntityIds),
    objectEntityIds: array(data.object_entity_ids ?? record.objectEntityIds),
    amount: canonicalAmount(record, data),
    evidence: record.evidence ?? { sourceUrl: data.url },
    data: compactData(data),
  };
}

export function relationsFromLakeRecord(record) {
  const data = record?.data && typeof record.data === "object" ? record.data : {};
  return array(data.relations).map((relation) => {
    const stableKey = [record.id, relation.fromId, relation.predicate, relation.toId].join("|");
    const id = `rel-${createHash("sha256").update(stableKey).digest("hex").slice(0, 24)}`;
    return {
      id,
      fromId: String(relation.fromId),
      predicate: String(relation.predicate),
      toId: String(relation.toId),
      evidenceRecordIds: [String(record.id)],
      period: record.occurredAt ? { from: record.occurredAt, to: record.occurredAt } : {},
      reconciliation: { method: relation.method ?? "official_source", confidence: 1 },
      disclaimer: relation.disclaimer ?? "La relacion documental no implica irregularidad ni responsabilidad.",
    };
  }).filter((relation) => relation.fromId && relation.predicate && relation.toId);
}

export function entityFromRosterMember(member) {
  if (!member?.entityId || !member?.name || !member?.chamber || !member?.evidenceUrl) {
    throw new Error("D1_INVALID_ROSTER_MEMBER");
  }
  const officialId = String(member.entityId).split("-").at(-1);
  return {
    id: String(member.entityId),
    kind: "person",
    name: String(member.name),
    identifiers: [{
      scheme: member.chamber === "camara" ? "camara-dipid" : "senado-id",
      value: officialId,
      isPublic: true,
      sourceUrl: String(member.evidenceUrl),
    }],
    attributes: { chamber: String(member.chamber), country: "CL" },
    sourceIds: [member.chamber === "camara" ? "camara" : "senado"],
    updatedAt: null,
  };
}

export function sourceStateChecksum(source, partitions) {
  const explicit = source?.indexChecksumSha256 ?? source?.checksumSha256;
  if (explicit) return String(explicit);
  const projection = array(partitions)
    .filter((partition) => partition?.sourceId === source?.id)
    .map((partition) => `${partition.id}:${partition.checksumSha256 ?? ""}:${partition.recordCount ?? 0}`)
    .sort()
    .join("\n");
  if (!projection) return null;
  return createHash("sha256").update(projection).digest("hex");
}
