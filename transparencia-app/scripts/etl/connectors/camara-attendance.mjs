import { createHash } from "node:crypto";
import { SaxesParser } from "saxes";
import { stableStringify } from "../core.mjs";

const API_BASE = "https://opendata.congreso.cl/camaradiputados/WServices/WSSala.asmx";
const MAX_SESSIONS_XML_BYTES = 2_000_000;
const MAX_ATTENDANCE_XML_BYTES = 2_000_000;
const SOURCE_LICENSE = "Información pública oficial; redistribución de originales no presumida";

function validYear(year) {
  if (!Number.isInteger(year) || year < 1990 || year > 2100) throw new Error("CAMARA_INVALID_YEAR");
}

function positiveInteger(value, errorCode) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(errorCode);
  return parsed;
}

function nonNegativeInteger(value, errorCode) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(errorCode);
  return parsed;
}

export function buildCamaraSessionsUrl(year) {
  validYear(year);
  const url = new URL(`${API_BASE}/retornarSesionesXAnno`);
  url.searchParams.set("prmAnno", String(year));
  return url.toString();
}

export function buildCamaraAttendanceUrl(sessionId) {
  const id = positiveInteger(sessionId, "CAMARA_INVALID_SESSION_ID");
  const url = new URL(`${API_BASE}/retornarSesionAsistencia`);
  url.searchParams.set("prmSesionId", String(id));
  return url.toString();
}

function localName(name) {
  return String(name).includes(":") ? String(name).slice(String(name).lastIndexOf(":") + 1) : String(name);
}

function parseXmlTree(xml, maxBytes) {
  if (typeof xml !== "string" || Buffer.byteLength(xml, "utf8") > maxBytes) throw new Error("CAMARA_XML_TOO_LARGE");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("CAMARA_UNSAFE_XML");
  let root = null;
  const stack = [];
  const parser = new SaxesParser();
  parser.on("opentag", (tag) => {
    const attributes = {};
    for (const [name, value] of Object.entries(tag.attributes ?? {})) attributes[localName(name)] = typeof value === "string" ? value : value.value;
    const node = { name: localName(tag.name), attributes, text: "", children: [] };
    if (stack.length) stack.at(-1).children.push(node);
    else if (root) throw new Error("CAMARA_INVALID_XML_ROOT");
    else root = node;
    stack.push(node);
  });
  parser.on("text", (value) => { if (stack.length) stack.at(-1).text += value; });
  parser.on("cdata", (value) => { if (stack.length) stack.at(-1).text += value; });
  parser.on("closetag", () => { stack.pop(); });
  parser.on("error", (error) => { throw error; });
  try {
    parser.write(xml).close();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("CAMARA_")) throw error;
    throw new Error(`CAMARA_INVALID_XML: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!root || stack.length) throw new Error("CAMARA_INVALID_XML");
  return root;
}

function children(node, name) {
  return node?.children?.filter((item) => item.name === name) ?? [];
}

function child(node, name) {
  return children(node, name)[0] ?? null;
}

function text(node, name, required = true) {
  const value = (name ? child(node, name) : node)?.text?.replace(/\s+/g, " ").trim() ?? "";
  if (required && !value) throw new Error(`CAMARA_MISSING_${String(name).toUpperCase()}`);
  return value || null;
}

function codedValue(node, name) {
  const target = child(node, name);
  if (!target) throw new Error(`CAMARA_MISSING_${name.toUpperCase()}`);
  return {
    code: nonNegativeInteger(target.attributes.Valor, `CAMARA_INVALID_${name.toUpperCase()}_CODE`),
    label: text(target, null),
  };
}

function dateTime(value, errorCode) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value ?? "")) throw new Error(errorCode);
  return value;
}

function parseSessionNode(node) {
  const start = dateTime(text(node, "FechaInicio"), "CAMARA_INVALID_SESSION_START");
  const end = dateTime(text(node, "FechaTermino"), "CAMARA_INVALID_SESSION_END");
  return {
    id: positiveInteger(text(node, "Id"), "CAMARA_INVALID_SESSION_ID"),
    number: nonNegativeInteger(text(node, "Numero"), "CAMARA_INVALID_SESSION_NUMBER"),
    startsAt: start,
    endsAt: end,
    date: start.slice(0, 10),
    type: codedValue(node, "Tipo"),
    state: codedValue(node, "Estado"),
  };
}

export function parseCamaraSessionsXml(xml) {
  const root = parseXmlTree(xml, MAX_SESSIONS_XML_BYTES);
  if (root.name !== "SesionesSalaColeccion") throw new Error("CAMARA_INVALID_SESSIONS_SCHEMA");
  const sessions = children(root, "Sesion").map(parseSessionNode);
  if (!sessions.length) throw new Error("CAMARA_NO_SESSIONS");
  const ids = new Set(sessions.map((session) => session.id));
  if (ids.size !== sessions.length) throw new Error("CAMARA_DUPLICATE_SESSION");
  return sessions.sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id - b.id);
}

function optionalBoolean(node, name) {
  const value = text(node, name, false);
  if (value === null) return null;
  if (value !== "true" && value !== "false") throw new Error(`CAMARA_INVALID_${name.toUpperCase()}`);
  return value === "true";
}

function parseAttendanceNode(node) {
  const deputyNode = child(node, "Diputado");
  if (!deputyNode) throw new Error("CAMARA_MISSING_DEPUTY");
  const deputyId = positiveInteger(text(deputyNode, "Id"), "CAMARA_INVALID_DEPUTY_ID");
  const deputyName = [text(deputyNode, "Nombre"), text(deputyNode, "ApellidoPaterno"), text(deputyNode, "ApellidoMaterno", false)]
    .filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const justificationNode = child(node, "Justificacion");
  const titularNode = child(node, "TipoTitularAsistencia");
  return {
    type: codedValue(node, "TipoAsistencia"),
    deputy: { id: deputyId, name: deputyName },
    justification: justificationNode ? {
      code: nonNegativeInteger(justificationNode.attributes.Valor, "CAMARA_INVALID_JUSTIFICATION_CODE"),
      name: text(justificationNode, "Nombre"),
      reduces_attendance: optionalBoolean(justificationNode, "RebajaAsistencia"),
      reduces_quorum: optionalBoolean(justificationNode, "RebajaQuorum"),
    } : null,
    titularType: titularNode ? {
      code: nonNegativeInteger(titularNode.attributes.Valor, "CAMARA_INVALID_TITULAR_TYPE_CODE"),
      label: text(titularNode, null),
    } : null,
  };
}

export function parseCamaraAttendanceXml(xml) {
  const root = parseXmlTree(xml, MAX_ATTENDANCE_XML_BYTES);
  if (root.name !== "SesionSala") throw new Error("CAMARA_INVALID_ATTENDANCE_SCHEMA");
  const session = parseSessionNode(root);
  const list = child(root, "ListadoAsistencia");
  if (!list) throw new Error("CAMARA_MISSING_ATTENDANCE_LIST");
  const attendance = children(list, "Asistencia").map(parseAttendanceNode);
  if (!attendance.length) throw new Error("CAMARA_EMPTY_ATTENDANCE");
  const deputyIds = new Set(attendance.map((item) => item.deputy.id));
  if (deputyIds.size !== attendance.length) throw new Error("CAMARA_DUPLICATE_ATTENDANCE");
  return { ...session, attendance: attendance.sort((a, b) => a.deputy.id - b.deputy.id) };
}

export function normalizeCamaraAttendance(session, attendance, { sourceUrl }) {
  if (session?.state?.code !== 1) throw new Error("CAMARA_SESSION_NOT_CELEBRATED");
  const deputyId = positiveInteger(attendance?.deputy?.id, "CAMARA_INVALID_DEPUTY_ID");
  const deputyName = String(attendance?.deputy?.name ?? "").replace(/\s+/g, " ").trim();
  if (!deputyName) throw new Error("CAMARA_INVALID_DEPUTY_NAME");
  const deputyEntityId = `person-camara-${deputyId}`;
  return {
    id: `camara-attendance-${session.id}-${deputyId}`,
    fecha: session.date,
    period: session.date.slice(0, 7),
    kind: "attendance",
    title: `Asistencia a sesión de Sala N° ${session.number}`,
    description: "Registro oficial de asistencia de la Cámara. La presencia, ausencia o justificación informada no implica por sí sola una irregularidad.",
    session: {
      official_id: String(session.id), number: session.number, starts_at: session.startsAt, ends_at: session.endsAt,
      type: session.type, state: session.state,
    },
    attendance: attendance.type,
    justification: attendance.justification,
    titular_type: attendance.titularType,
    deputy: { entity_id: deputyEntityId, official_id: String(deputyId), name: deputyName, role: "Diputado/a" },
    public_body: { entity_id: "public-body-camara", official_id: "camara-diputadas-diputados", name: "Cámara de Diputadas y Diputados" },
    subject_entity_ids: [deputyEntityId],
    object_entity_ids: ["public-body-camara"],
    url: sourceUrl,
    fuente: "Cámara de Diputadas y Diputados · WSSala",
    license: SOURCE_LICENSE,
    evidence_locator: `Sesión ${session.id} · diputado ${deputyId}`,
    reconciliation_method: "official_camara_dipid",
  };
}

async function fetchXml(url, fetchImpl, timeoutMs, maxBytes) {
  let response;
  try {
    response = await fetchImpl(url, {
      headers: { Accept: "text/xml, application/xml", "User-Agent": "TransparenciaChile-ETL/3.0" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error?.name === "AbortError" || error?.name === "TimeoutError") throw new Error("CAMARA_TIMEOUT");
    throw new Error(`CAMARA_FETCH_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) throw new Error(`CAMARA_HTTP_${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!/(?:text|application)\/xml/i.test(contentType)) throw new Error("CAMARA_INVALID_CONTENT_TYPE");
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new Error("CAMARA_XML_TOO_LARGE");
  const xml = await response.text();
  if (Buffer.byteLength(xml, "utf8") > maxBytes) throw new Error("CAMARA_XML_TOO_LARGE");
  return xml;
}

async function mapConcurrent(items, concurrency, mapper) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16) throw new Error("CAMARA_INVALID_CONCURRENCY");
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function fetchCamaraAttendance({ year, fetchImpl = fetch, timeoutMs = 60_000, concurrency = 8, onProgress = null }) {
  validYear(year);
  const sessionsUrl = buildCamaraSessionsUrl(year);
  const sessionsXml = await fetchXml(sessionsUrl, fetchImpl, timeoutMs, MAX_SESSIONS_XML_BYTES);
  const sessions = parseCamaraSessionsXml(sessionsXml);
  if (sessions.some((session) => !session.date.startsWith(`${year}-`))) throw new Error("CAMARA_SESSION_OUTSIDE_YEAR");
  const publishedSessions = sessions.filter((session) => session.state.code === 1);
  let completed = 0;
  const details = await mapConcurrent(publishedSessions, concurrency, async (session) => {
    const sourceUrl = buildCamaraAttendanceUrl(session.id);
    const xml = await fetchXml(sourceUrl, fetchImpl, timeoutMs, MAX_ATTENDANCE_XML_BYTES);
    const detail = parseCamaraAttendanceXml(xml);
    if (detail.id !== session.id || detail.date !== session.date) throw new Error(`CAMARA_SESSION_DETAIL_MISMATCH: ${session.id}`);
    const result = {
      session,
      xml,
      checksumSha256: createHash("sha256").update(xml).digest("hex"),
      records: detail.attendance.map((attendance) => normalizeCamaraAttendance(detail, attendance, { sourceUrl })),
    };
    completed += 1;
    onProgress?.({ phase: "sessions", completed, total: publishedSessions.length, sessionId: session.id });
    return result;
  });
  const records = details.flatMap((detail) => detail.records).sort((a, b) => a.id.localeCompare(b.id));
  const ids = new Set(records.map((record) => record.id));
  if (ids.size !== records.length) throw new Error("CAMARA_DUPLICATE_RECORD");
  const listChecksumSha256 = createHash("sha256").update(sessionsXml).digest("hex");
  const byMonth = new Map();
  for (const detail of details) {
    const month = Number(detail.session.date.slice(5, 7));
    const group = byMonth.get(month) ?? [];
    group.push(detail);
    byMonth.set(month, group);
  }
  const originals = [...byMonth.entries()].sort(([a], [b]) => a - b).map(([month, monthDetails]) => {
    const fingerprint = `${stableStringify({
      annualSessionsChecksumSha256: listChecksumSha256,
      sessions: monthDetails.map((detail) => ({ id: detail.session.id, checksumSha256: detail.checksumSha256, size: Buffer.byteLength(detail.xml) })),
    })}\n`;
    return {
      year, month,
      name: `camara-${year}-${String(month).padStart(2, "0")}-asistencia-wssala-manifest.json`,
      url: sessionsUrl,
      checksumSha256: createHash("sha256").update(fingerprint).digest("hex"),
      size: monthDetails.reduce((total, detail) => total + Buffer.byteLength(detail.xml), 0),
      license: SOURCE_LICENSE,
      redistributable: false,
    };
  });
  return {
    sourceId: "camara", year, records, originals,
    sessionsFound: sessions.length,
    sessionsPublished: publishedSessions.length,
    sessionsUnavailable: sessions.length - publishedSessions.length,
    periods: [...byMonth.keys()].sort((a, b) => a - b).map((month) => `${year}-${String(month).padStart(2, "0")}`),
    annualSessionsChecksumSha256: listChecksumSha256,
  };
}
