/**
 * Contrato de normalización para Cámara y Senado.
 *
 * Cada fila conserva su fuente y representación original. La categoría es
 * única por fila: no se suman votaciones, gastos, asesorías ni personal de
 * apoyo, aunque compartan organismo o persona.
 */

const CATEGORY_SET = new Set([
  "autoridades",
  "votaciones",
  "gastos_operacionales",
  "asesorias",
  "personal_apoyo",
]);

const VOTE_SOURCES = new Set(["votaciones_camara", "votaciones_senado"]);
const EXPENSE_SOURCES = new Set(["gastos_camara", "gastos_senado"]);

export function normalizeLegislativeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeLegislativePeriod(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const iso = raw.match(/(\d{4})[-/]?(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const months = {
    enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
    julio: "07", agosto: "08", septiembre: "09", setiembre: "09", octubre: "10",
    noviembre: "11", diciembre: "12",
  };
  const match = raw.toLocaleLowerCase("es-CL").normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(\d{4})/);
  return match ? `${match[2]}-${months[match[1]]}` : raw;
}

export function legislativeChamber(sourceId) {
  const id = String(sourceId ?? "").toLowerCase();
  if (id.includes("senado")) return "senado";
  if (id.includes("camara") || id === "congreso_opendata" || id === "personal-apoyo") return "camara";
  return null;
}

function asNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const digits = value.replace(/[^0-9-]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function amountValue(row) {
  return row?.monto_clp ?? row?.sueldo ?? row?.monto ?? null;
}

function inferCategory(sourceId, row) {
  const source = String(sourceId ?? "");
  const text = normalizeLegislativeText([
    row?.item,
    row?.kind,
    row?.tipo,
    row?.categoria,
    row?.category,
  ].filter(Boolean).join(" "));

  if (VOTE_SOURCES.has(source)) return { category: "votaciones", evidence: "source_id" };
  if (source.startsWith("personal-apoyo")) return { category: "personal_apoyo", evidence: "source_id" };
  if (EXPENSE_SOURCES.has(source)) {
    if (/asesor|asesoria|consultor/.test(text)) return { category: "asesorias", evidence: "item" };
    return { category: "gastos_operacionales", evidence: "source_id" };
  }
  if (/personal de apoyo|apoyo parlamentario/.test(text)) return { category: "personal_apoyo", evidence: "item" };
  if (/asesor|asesoria|consultor/.test(text)) return { category: "asesorias", evidence: "item" };
  if (source === "camara" || source === "senado" || source === "congreso_opendata") {
    return { category: "autoridades", evidence: "source_id" };
  }
  return { category: "autoridades", evidence: "fallback" };
}

function personOriginal(row) {
  const composed = [row?.nombre, row?.apellido_paterno, row?.apellido_materno].filter((value) => typeof value === "string" && value.trim()).join(" ");
  if (composed) return composed;
  if (typeof row?.person === "string") return row.person;
  if (typeof row?.name === "string") return row.name;
  if (typeof row?.diputado === "string") return row.diputado;
  return null;
}

function officialUrls(row, defaultOfficialUrls = []) {
  const candidates = [row?.url, row?.source_url, row?.url_tramitacion, ...defaultOfficialUrls];
  return [...new Set(candidates.filter((value) => typeof value === "string" && /^https?:\/\//i.test(value)))];
}

function qualityObservations(sourceId, row, category, categoryEvidence, urls, period) {
  const observations = [];
  if (!String(row?.id ?? "").trim()) observations.push("id_ausente");
  if (categoryEvidence === "fallback") observations.push("categoria_inferida_por_fallback");
  if (categoryEvidence === "item") observations.push("categoria_inferida_por_item");
  if ((VOTE_SOURCES.has(sourceId) || EXPENSE_SOURCES.has(sourceId) || sourceId === "personal-apoyo") && !period) {
    observations.push("periodo_ausente");
  }
  if (category === "gastos_operacionales" || category === "asesorias") {
    if (asNumber(amountValue(row)) === null) observations.push("monto_ausente");
  }
  if (!urls.length) observations.push("fuente_url_ausente");
  return observations;
}

export function normalizeLegislativeRecord(sourceId, row, {
  sourceLabel = sourceId,
  releaseId = null,
  checksum = null,
  publishedAt = null,
  recordId = null,
  defaultOfficialUrls = [],
  defaultPeriod = null,
} = {}) {
  const { category, evidence: categoryEvidence } = inferCategory(sourceId, row);
  const urls = officialUrls(row, defaultOfficialUrls);
  const person = personOriginal(row);
  const period = String(row?.periodo ?? row?.fecha ?? defaultPeriod ?? "").trim() || null;
  const qualityObservations = qualityObservationsFor(sourceId, row, category, categoryEvidence, urls, period);
  return {
    sourceId,
    sourceLabel,
    sourceType: "legislative",
    chamber: legislativeChamber(sourceId),
    recordId: String(recordId ?? row?.id ?? "").trim() || null,
    recordIdOrigin: row?.id ? "source" : (recordId ? "technical" : null),
    category,
    categoryEvidence,
    personOriginal: person,
    personNormalized: normalizeLegislativeText(person),
    organismoOriginal: sourceLabel,
    organismoNormalizado: normalizeLegislativeText(sourceLabel),
    cargoOriginal: row?.cargo ?? null,
    cargoNormalizado: normalizeLegislativeText(row?.cargo),
    periodoOriginal: period,
    periodo: normalizeLegislativePeriod(period),
    fechaOriginal: row?.fecha ?? null,
    montoOriginal: amountValue(row),
    montoClp: asNumber(amountValue(row)),
    officialUrls: urls,
    qualityObservations,
    releaseId,
    checksum,
    publishedAt,
    original: row,
  };
}

// Kept separate to make the validation rule independently testable and
// prevent accidental recursion if the observation rules evolve.
function qualityObservationsFor(sourceId, row, category, categoryEvidence, urls, period) {
  return qualityObservations(sourceId, row, category, categoryEvidence, urls, period);
}

export function normalizeLegislativeRelease({ sourceId, sourceLabel = sourceId, rows = [], releaseId = null, checksum = null, publishedAt = null, recordIdForRow = null, metadataForRow = null }) {
  const records = rows.map((row, index) => normalizeLegislativeRecord(sourceId, row, {
    sourceLabel,
    releaseId,
    checksum,
    publishedAt,
    recordId: recordIdForRow?.(row, index) ?? null,
    ...(metadataForRow?.(row, index) ?? {}),
  }));
  const observations = records.flatMap((record) => record.qualityObservations);
  return {
    sourceId,
    sourceLabel,
    sourceType: "legislative",
    chamber: legislativeChamber(sourceId),
    releaseId,
    checksum,
    publishedAt,
    records,
    summary: {
      records: records.length,
      categories: Object.fromEntries([...CATEGORY_SET].map((category) => [
        category,
        records.filter((record) => record.category === category).length,
      ])),
      periods: [...new Set(records.map((record) => record.periodo).filter(Boolean))].sort(),
      withAmount: records.filter((record) => record.montoClp !== null).length,
      withOfficialUrl: records.filter((record) => record.officialUrls.length > 0).length,
      withQualityObservations: records.filter((record) => record.qualityObservations.length > 0).length,
      observationCounts: Object.fromEntries([...new Set(observations)].map((key) => [
        key,
        observations.filter((value) => value === key).length,
      ])),
    },
  };
}

export function validateLegislativeRelease(release) {
  if (!release || release.sourceType !== "legislative") throw new Error("LEGISLATIVE_RELEASE_INVALID");
  if (!release.chamber || !["camara", "senado"].includes(release.chamber)) throw new Error("LEGISLATIVE_CHAMBER_INVALID");
  if (!Array.isArray(release.records)) throw new Error("LEGISLATIVE_RECORDS_INVALID");
  const ids = new Set();
  for (const record of release.records) {
    if (!CATEGORY_SET.has(record.category)) throw new Error(`LEGISLATIVE_CATEGORY_INVALID:${record.recordId}`);
    if (!record.recordId) throw new Error("LEGISLATIVE_RECORD_ID_MISSING");
    if (ids.has(record.recordId)) throw new Error(`LEGISLATIVE_DUPLICATE_ID:${record.recordId}`);
    ids.add(record.recordId);
    const originalIdMatches = record.recordIdOrigin === "technical"
      ? record.original && !record.original.id
      : record.original && record.original.id === record.recordId;
    if (!originalIdMatches) {
      throw new Error(`LEGISLATIVE_ORIGINAL_MISSING:${record.recordId}`);
    }
  }
  return release;
}
