/**
 * Normalización auditable del dominio de Movimientos.
 *
 * Este módulo es deliberadamente puro: no consulta D1/R2, no escribe releases
 * y no altera las filas originales. Su salida sirve para validar el contrato
 * antes de que un índice o una vista pública consuma el snapshot.
 */

const OFFICIAL_LEVELS = new Set(["oficial", "official"]);

export function normalizeMovementText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeMovementPersonName(value) {
  const original = String(value ?? "").trim();
  const normalized = normalizeMovementText(original);
  return {
    nombreOriginal: original || null,
    nombreNormalizado: normalized || null,
    personKey: normalized ? normalized.split(" ").sort().join(" ") : null,
  };
}

function personName(value) {
  if (typeof value === "string") return value;
  return value?.nombre ?? value?.name ?? "";
}

function officialUrls(record) {
  const urls = [];
  if (record?.decreto_url) urls.push(String(record.decreto_url));
  for (const source of Array.isArray(record?.fuentes) ? record.fuentes : []) {
    if (OFFICIAL_LEVELS.has(String(source?.nivel ?? "").toLowerCase()) && source?.url) {
      urls.push(String(source.url));
    }
  }
  return [...new Set(urls)];
}

function qualityObservations(record, officialSourceUrls) {
  const observations = [];
  if (!String(record?.id ?? "").trim()) observations.push("id_ausente");
  if (!String(record?.fecha ?? "").trim()) observations.push("fecha_evento_ausente");
  if (!String(record?.cargo ?? "").trim()) observations.push("cargo_ausente");
  if (!String(record?.organismo ?? record?.organo ?? "").trim()) observations.push("organismo_ausente");
  if (!officialSourceUrls.length) observations.push("fuente_oficial_ausente");
  if (record?.documento_pendiente === true) observations.push("documento_pendiente");
  if (!["verificado", "en_confirmacion"].includes(record?.estado)) observations.push("estado_no_reconocido");
  return observations;
}

export function normalizeMovementRecord(record, {
  releaseId = null,
  checksum = null,
  publishedAt = null,
} = {}) {
  const officialSourceUrls = officialUrls(record);
  const saliente = normalizeMovementPersonName(personName(record?.salio) || record?.saliente);
  const entrante = normalizeMovementPersonName(personName(record?.entro) || record?.entrante);
  const eventDate = String(record?.fecha ?? "").trim() || null;
  const observations = qualityObservations(record, officialSourceUrls);

  return {
    sourceId: "movimientos",
    sourceLabel: "Movimientos de autoridades",
    sourceType: "authority_movements",
    recordId: String(record?.id ?? "").trim() || null,
    eventTypeOriginal: record?.tipo_evento ?? record?.tipo ?? null,
    eventTypeNormalized: normalizeMovementText(record?.tipo_evento ?? record?.tipo) || null,
    organismoOriginal: record?.organismo ?? record?.organo ?? null,
    organismoNormalizado: normalizeMovementText(record?.organismo ?? record?.organo) || null,
    cargoOriginal: record?.cargo ?? null,
    cargoNormalizado: normalizeMovementText(record?.cargo) || null,
    periodo: eventDate?.slice(0, 7) ?? null,
    fechaEvento: eventDate,
    fechaDeteccion: record?.fecha_deteccion ?? null,
    fechaVerificacion: record?.fecha_verificacion ?? null,
    fechaPublicacion: publishedAt,
    estadoRegistro: record?.estado ?? (record?.verificado ? "verificado" : "en_confirmacion"),
    personas: { saliente, entrante },
    officialUrls: officialSourceUrls,
    qualityObservations: observations,
    releaseId,
    checksum,
    original: record,
  };
}

export function normalizeMovementRelease(payload) {
  const rows = Array.isArray(payload?.movimientos) ? payload.movimientos : [];
  const checksum = payload?.checksum_sha256 ?? null;
  const releaseId = checksum ? `movimientos-${String(checksum).slice(0, 16)}` : null;
  const publishedAt = payload?.last_success_at ?? payload?.last_run ?? null;
  const records = rows.map((record) => normalizeMovementRecord(record, {
    releaseId,
    checksum,
    publishedAt,
  }));

  const observations = records.flatMap((record) => record.qualityObservations);
  return {
    sourceId: "movimientos",
    sourceLabel: "Movimientos de autoridades",
    sourceType: "authority_movements",
    releaseId,
    checksum,
    publishedAt,
    records,
    summary: {
      records: records.length,
      verified: records.filter((record) => record.estadoRegistro === "verificado").length,
      pending: records.filter((record) => record.estadoRegistro === "en_confirmacion").length,
      withOfficialSource: records.filter((record) => record.officialUrls.length > 0).length,
      withQualityObservations: records.filter((record) => record.qualityObservations.length > 0).length,
      observationCounts: Object.fromEntries([...new Set(observations)].map((key) => [
        key,
        observations.filter((value) => value === key).length,
      ])),
    },
  };
}

export function validateMovementNormalization(release) {
  if (!release || release.sourceId !== "movimientos") throw new Error("MOVIMIENTOS_NORMALIZED_SOURCE_INVALID");
  if (!Array.isArray(release.records)) throw new Error("MOVIMIENTOS_NORMALIZED_RECORDS_INVALID");
  const ids = new Set();
  for (const record of release.records) {
    if (!record.recordId) throw new Error("MOVIMIENTOS_NORMALIZED_ID_MISSING");
    if (ids.has(record.recordId)) throw new Error(`MOVIMIENTOS_NORMALIZED_DUPLICATE_ID:${record.recordId}`);
    ids.add(record.recordId);
    if (!record.original || record.original.id !== record.recordId) {
      throw new Error(`MOVIMIENTOS_NORMALIZED_ORIGINAL_MISSING:${record.recordId}`);
    }
  }
  return release;
}
