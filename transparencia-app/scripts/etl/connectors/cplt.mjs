import { createHash } from "node:crypto";
import { sanitizeForPublication, stableStringify } from "../core.mjs";

const PROBIDAD_GRAPH = "<http://datos.cplt.cl/datos/infoprobidad/>";
const LOBBY_GRAPH = "<http://datos.infolobby.cl/infolobby>";
const LOBBY_TYPES = {
  audience: "cplt:RegistroAudiencia",
  travel: "cplt:Viaje",
  gift: "cplt:Donativo",
};
const LOBBY_CATALOG_ROOT = "https://www.infolobby.cl/DatosAbiertos/Catalogos/VirtuosoLobby";
const LOBBY_DATASETS = [
  "audiencias",
  "datosAudiencia",
  "asistenciasActivos",
  "asistenciasPasivos",
  "representaciones",
  "trabajaPara",
  "otrosAsistentes",
  "viajes",
  "donativos",
];
const LOBBY_REQUIRED_COLUMNS = {
  audiencias: ["uriAudiencia", "CodigoURI", "uriOrganismo", "organismo", "fechaEvento"],
  datosAudiencia: ["codigoAudiencia"],
  asistenciasActivos: ["codigoActivo", "activo", "codigoAudiencia"],
  asistenciasPasivos: ["codigoPasivo", "pasivo", "codigoOrganismo", "organismo", "codigoAudiencia"],
  representaciones: ["codigoRepresentado", "representado", "personalidad", "codigoAudiencia"],
  trabajaPara: ["codigoEmpLobby", "empresaLobby", "codigoActivo", "codigoAudiencia"],
  otrosAsistentes: ["asistente", "codigoAudiencia"],
  viajes: ["codigoViaje", "codigoPasivo", "organismo", "IdOrPortal", "fechaInicio"],
  donativos: ["codigoDonativo", "codigoPasivo", "organismo", "IdOrPortal", "fechaDonativo"],
};
const MAX_LOBBY_DATASET_BYTES = 500_000_000;
const LOBBY_AUXILIARY_DATASETS = new Set(["datosAudiencia", "otrosAsistentes"]);

export async function fetchSparqlPages(fetchPage, { pageSize = 1000 } = {}) {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) throw new Error("INVALID_PAGE_SIZE");
  const all = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchPage(offset, pageSize);
    all.push(...page);
    if (page.length < pageSize) return all;
  }
}

export function createInfoLobbyQuery(kind, from, to, limit, offset) {
  const rdfType = LOBBY_TYPES[kind];
  if (!rdfType) throw new Error(`INVALID_LOBBY_KIND: ${kind}`);
  return `PREFIX cplt: <http://datos.infolobby.cl/ontologia/cplt#>
SELECT ?r ?fecha ?p ?o WHERE {
  GRAPH ${LOBBY_GRAPH} {
    ?r a ${rdfType}; ?p ?o .
    OPTIONAL { ?r cplt:fechaEvento ?fechaEvento }
    OPTIONAL { ?r cplt:fechaInicio ?fechaInicio }
    OPTIONAL { ?r cplt:fechaRegistro ?fechaRegistro }
    BIND(COALESCE(?fechaEvento, ?fechaInicio, ?fechaRegistro) AS ?fecha)
    FILTER(BOUND(?fecha) && SUBSTR(STR(?fecha), 1, 10) >= ${JSON.stringify(from)} && SUBSTR(STR(?fecha), 1, 10) <= ${JSON.stringify(to)})
  }
} ORDER BY ?r ?p ?o LIMIT ${limit} OFFSET ${offset}`;
}

export function createInfoProbidadQuery(from, to, limit, offset) {
  return `PREFIX prob: <http://datos.cplt.cl/ontologias/infoprobidad/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT DISTINCT ?d ?persona ?nombre ?fecha ?org ?orgNombre ?json WHERE {
  GRAPH ${PROBIDAD_GRAPH} {
    ?d a prob:Declaracion; prob:declaracionDe ?persona; prob:fechaDeclaracion ?fecha; prob:organismoFuente ?org .
    { ?persona foaf:name ?nombre } UNION { ?persona rdfs:label ?nombre }
    OPTIONAL { ?org rdfs:label ?orgNombre }
    OPTIONAL { ?d prob:jsonCargado ?json }
    FILTER(SUBSTR(STR(?fecha), 1, 10) >= ${JSON.stringify(from)} && SUBSTR(STR(?fecha), 1, 10) <= ${JSON.stringify(to)})
  }
} ORDER BY ?d LIMIT ${limit} OFFSET ${offset}`;
}

function bindings(payload) {
  const rows = payload?.results?.bindings;
  if (!Array.isArray(rows)) throw new Error("INVALID_SPARQL_SCHEMA");
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value?.value])));
}

const MAX_SPARQL_PAGE_BYTES = 250_000_000;

async function queryDocument(endpoint, sparql, fetchImpl, timeoutMs) {
  const url = `${endpoint}?format=json&query=${encodeURIComponent(sparql)}`;
  const response = await fetchImpl(url, {
    headers: { Accept: "application/sparql-results+json", "User-Agent": "TransparenciaChile-ETL/3.0" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`SPARQL_HTTP_${response.status}`);
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_SPARQL_PAGE_BYTES) throw new Error("SPARQL_PAGE_TOO_LARGE");
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_SPARQL_PAGE_BYTES) throw new Error("SPARQL_PAGE_TOO_LARGE");
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("INVALID_SPARQL_JSON");
  }
  return {
    url,
    rows: bindings(payload),
    checksumSha256: createHash("sha256").update(text).digest("hex"),
    size: Buffer.byteLength(text, "utf8"),
  };
}

function preserveLegalRuts(value) {
  if (Array.isArray(value)) return value.map(preserveLegalRuts);
  if (!value || typeof value !== "object") return value;
  const entries = Object.entries(value).map(([key, item]) => [key, preserveLegalRuts(item)]);
  const object = Object.fromEntries(entries);
  if (typeof object.Nombre_Razon_Social === "string" && object.Nombre_Razon_Social !== "RESERVADO"
    && typeof object.RUT === "string" && object.RUT !== "RESERVADO") {
    object.rut_juridico = object.RUT;
  }
  return object;
}

export function projectProbidadJson(rawJson) {
  if (!rawJson) return null;
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error("INVALID_PROBIDAD_JSON");
  }
  return sanitizeForPublication(preserveLegalRuts(parsed));
}

function requestedMonths(from, to) {
  const periods = [];
  let cursor = new Date(`${from.slice(0, 7)}-01T00:00:00Z`);
  const end = new Date(`${to.slice(0, 7)}-01T00:00:00Z`);
  while (cursor <= end) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const monthEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    periods.push({ year, month, from: from > monthStart ? from : monthStart, to: to < monthEnd ? to : monthEnd });
    cursor = new Date(Date.UTC(year, month, 1));
  }
  return periods;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw new Error("INVALID_INFOPROBIDAD_CONCURRENCY");
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

export async function fetchInfoProbidadBundle({ from, to, fetchImpl = fetch, pageSize = 1000, timeoutMs = 120_000, concurrency = 2, onProgress = null }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to
    || Number.isNaN(new Date(`${from}T00:00:00Z`).getTime()) || Number.isNaN(new Date(`${to}T00:00:00Z`).getTime())) {
    throw new Error("INVALID_INFOPROBIDAD_RANGE");
  }
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 5000) throw new Error("INVALID_INFOPROBIDAD_PAGE_SIZE");
  const periods = requestedMonths(from, to);
  const results = await mapWithConcurrency(periods, concurrency, async (period) => {
    const rows = [];
    const pages = [];
    for (let offset = 0; ; offset += pageSize) {
      const document = await queryDocument(
        "https://datos.cplt.cl/sparql",
        createInfoProbidadQuery(period.from, period.to, pageSize, offset),
        fetchImpl,
        timeoutMs,
      );
      rows.push(...document.rows);
      pages.push({ offset, checksumSha256: document.checksumSha256, size: document.size, rowCount: document.rows.length });
      onProgress?.({ phase: "pages", year: period.year, month: period.month, offset, rows: rows.length });
      if (document.rows.length < pageSize) break;
    }
    const records = projectInfoProbidadRows(rows);
    const fingerprint = `${stableStringify({ period: `${period.year}-${String(period.month).padStart(2, "0")}`, pages })}\n`;
    return {
      period,
      records,
      original: {
        year: period.year,
        month: period.month,
        url: "https://datos.cplt.cl/sparql",
        pages,
        checksumSha256: createHash("sha256").update(fingerprint).digest("hex"),
        size: pages.reduce((total, page) => total + page.size, 0),
      },
    };
  });
  const records = results.flatMap((result) => result.records).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  if (new Set(records.map((record) => record.id)).size !== records.length) throw new Error("INFOPROBIDAD_DUPLICATE_DECLARATION");
  return { sourceId: "infoprobidad", records, originals: results.map((result) => result.original) };
}

export async function fetchInfoProbidad(options) {
  return (await fetchInfoProbidadBundle(options)).records;
}

function officialTail(value) {
  return String(value ?? "").split(/[\/#]/).filter(Boolean).at(-1)?.toLocaleLowerCase("es-CL").replace(/[^a-z0-9_-]/g, "-") ?? null;
}

function parseFormattedLegalRut(value) {
  const compact = String(value ?? "").replace(/[^0-9kK]/g, "");
  return parseInfoLobbyLegalRut(`${compact}r`);
}

function declarationLegalEntities(value, sourceUrl, path = [], found = new Map()) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => declarationLegalEntities(item, sourceUrl, [...path, String(index)], found));
    return found;
  }
  if (!value || typeof value !== "object") return found;
  const rut = parseFormattedLegalRut(value.rut_juridico);
  const name = String(value.Nombre_Razon_Social ?? "").replace(/\s+/g, " ").trim();
  if (rut && name && name !== "RESERVADO") {
    const id = `legal-cl-${rut.normalized.replace("-", "").toLocaleLowerCase("es-CL")}`;
    if (!found.has(id)) found.set(id, {
      id,
      kind: "legal_entity",
      name,
      rut_juridico: rut.formatted,
      identifiers: [{ scheme: "CL-RUT", value: rut.formatted, isPublic: true, sourceUrl }],
      attributes: { declaration_path: path.join("."), country: "CL" },
    });
  }
  for (const [key, item] of Object.entries(value)) declarationLegalEntities(item, sourceUrl, [...path, key], found);
  return found;
}

export function projectInfoProbidadRows(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const id = String(row.d ?? "").trim();
    const personUri = String(row.persona ?? "").trim();
    const name = String(row.nombre ?? "").replace(/\s+/g, " ").trim();
    const date = String(row.fecha ?? "").slice(0, 10);
    const orgUri = String(row.org ?? "").trim();
    const orgName = String(row.orgNombre ?? "").replace(/\s+/g, " ").trim();
    if (!id || !personUri || !name || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !orgUri || !orgName) throw new Error("INVALID_INFOPROBIDAD_ROW");
    const current = grouped.get(id) ?? { id, personUri, names: new Set(), date, json: row.json ?? null, organizations: new Map() };
    if (current.personUri !== personUri || current.date !== date || current.json !== (row.json ?? null)) throw new Error(`INFOPROBIDAD_DECLARATION_CONFLICT: ${id}`);
    current.names.add(name);
    current.organizations.set(orgUri, orgName);
    grouped.set(id, current);
  }

  return [...grouped.values()].map((group) => {
    const personCode = officialTail(group.personUri);
    if (!personCode) throw new Error(`INVALID_INFOPROBIDAD_PERSON_ID: ${group.id}`);
    const personId = `person-infoprobidad-${personCode}`;
    const sourceUrl = group.id;
    const declaration = projectProbidadJson(group.json);
    const compactDeclarantRut = String(declaration?.Datos_del_Declarante?.RUN ?? "").replace(/[^0-9kK]/g, "");
    const hasDeclarantRut = /^\d{7,8}[0-9K]$/i.test(compactDeclarantRut);
    const declarantRut = hasDeclarantRut
      ? `${compactDeclarantRut.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${compactDeclarantRut.slice(-1).toUpperCase()}`
      : null;
    const person = {
      id: personId,
      kind: "person",
      name: [...group.names].sort((a, b) => a.localeCompare(b, "es-CL"))[0],
      identifiers: [
        { scheme: "infoprobidad-person-code", value: group.personUri, isPublic: true, sourceUrl },
        ...(declarantRut ? [{ scheme: "CL-RUT", value: declarantRut, isPublic: true, sourceUrl }] : []),
      ],
      attributes: { country: "CL" },
    };
    const publicBodies = [...group.organizations.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([uri, name]) => {
      const code = officialTail(uri);
      if (!code) throw new Error(`INVALID_INFOPROBIDAD_ORGANIZATION_ID: ${group.id}`);
      return {
        id: `public-body-infoprobidad-${code}`,
        kind: "public_body",
        name,
        identifiers: [{ scheme: "infoprobidad-organization-code", value: uri, isPublic: true, sourceUrl }],
        attributes: { country: "CL" },
      };
    });
    const legalEntities = [...declarationLegalEntities(declaration, sourceUrl).values()];
    const relations = [
      ...publicBodies.map((body) => ({ fromId: personId, predicate: "filed_declaration_with", toId: body.id, method: "official_infoprobidad_id" })),
      ...legalEntities.map((entity) => ({ fromId: personId, predicate: "declared_legal_interest", toId: entity.id, method: "official_declaration_json" })),
    ];
    return sanitizeForPublication({
      id: group.id,
      kind: "declaration",
      fecha: group.date,
      title: `Declaración de intereses y patrimonio de ${person.name}`,
      description: "Registro documental oficial. Una participación o actividad declarada no implica irregularidad.",
      person_official_id: group.personUri,
      nombre: person.name,
      organizations: publicBodies.map((body) => ({ entity_id: body.id, name: body.name })),
      declaracion: declaration,
      entities: [person, ...publicBodies, ...legalEntities],
      subject_entity_ids: [personId],
      object_entity_ids: [...publicBodies, ...legalEntities].map((entity) => entity.id),
      relations,
      url: sourceUrl,
      fuente: "InfoProbidad · Consejo para la Transparencia",
      reconciliation_method: "official_infoprobidad_id",
    });
  }).sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

export function aggregateLobbyRows(kind, rows) {
  const records = new Map();
  for (const row of rows) {
    const record = records.get(row.r) ?? { id: row.r, kind, fecha: row.fecha ?? null, predicates: {} };
    const predicate = String(row.p ?? "").split(/[\/#]/).at(-1);
    if (predicate) {
      const values = record.predicates[predicate] ?? [];
      if (row.o !== undefined && !values.includes(row.o)) values.push(row.o);
      record.predicates[predicate] = values;
    }
    records.set(row.r, record);
  }
  return [...records.values()].map((record) => sanitizeForPublication({
    ...record,
    url: record.predicates.seeAlsoDev?.[0] ?? record.id,
    fuente: "InfoLobby · Consejo para la Transparencia",
  }));
}

function parseCsvTable(text) {
  if (!text || text.trim() === "0") return { header: [], rows: [] };
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  const [rawHeader, ...values] = rows;
  if (!rawHeader || rawHeader.length === 0) throw new Error("INVALID_CSV_SCHEMA");
  const header = rawHeader.map((key) => key.replace(/^\uFEFF/, ""));
  if (new Set(header).size !== header.length || header.some((key) => !key)) throw new Error("INVALID_CSV_SCHEMA");
  return { header, rows: values.map((items) => Object.fromEntries(header.map((key, index) => [key, items[index] ?? ""]))) };
}

export function parseCsv(text) {
  return parseCsvTable(text).rows;
}

export function createInfoLobbyDatasetUrl(year, quarter, dataset) {
  if (!LOBBY_DATASETS.includes(dataset)) throw new Error(`INVALID_LOBBY_DATASET: ${dataset}`);
  if (!Number.isInteger(year) || !Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
    throw new Error("INVALID_LOBBY_PERIOD");
  }
  return `${LOBBY_CATALOG_ROOT}/Datasets/${year}/${quarter}/${dataset}/csv`;
}

function requestedQuarters(from, to) {
  const periods = [];
  let year = Number(from.slice(0, 4));
  let quarter = Math.floor((Number(from.slice(5, 7)) - 1) / 3) + 1;
  const endYear = Number(to.slice(0, 4));
  const endQuarter = Math.floor((Number(to.slice(5, 7)) - 1) / 3) + 1;
  while (year < endYear || (year === endYear && quarter <= endQuarter)) {
    periods.push({ year, quarter });
    quarter += 1;
    if (quarter === 5) {
      quarter = 1;
      year += 1;
    }
  }
  return periods;
}

function retryableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

async function fetchLobbyDataset(year, quarter, dataset, fetchImpl, timeoutMs, retries, retryDelayMs) {
  const url = createInfoLobbyDatasetUrl(year, quarter, dataset);
  let response;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      response = await fetchImpl(url, {
        headers: { Accept: "text/csv", "User-Agent": "TransparenciaChile-ETL/3.0" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.ok || !retryableStatus(response.status) || attempt === retries) break;
      lastError = new Error(`INFOLOBBY_CSV_HTTP_${response.status}: ${dataset}/${year}Q${quarter}`);
    } catch (error) {
      lastError = error;
      if (attempt === retries) throw error;
    }
    if (retryDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)));
  }
  if (!response) throw lastError ?? new Error(`INFOLOBBY_CSV_UNAVAILABLE: ${dataset}/${year}Q${quarter}`);
  if (!response.ok) throw new Error(`INFOLOBBY_CSV_HTTP_${response.status}: ${dataset}/${year}Q${quarter}`);
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_LOBBY_DATASET_BYTES) throw new Error(`INFOLOBBY_CSV_TOO_LARGE: ${dataset}`);
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_LOBBY_DATASET_BYTES) throw new Error(`INFOLOBBY_CSV_TOO_LARGE: ${dataset}`);
  const table = parseCsvTable(text);
  const missing = text.trim() === "0" ? [] : LOBBY_REQUIRED_COLUMNS[dataset].filter((column) => !table.header.includes(column));
  if (missing.length) throw new Error(`INVALID_INFOLOBBY_CSV_SCHEMA: ${dataset}/${missing.join(",")}`);
  return {
    url,
    rows: table.rows,
    checksumSha256: createHash("sha256").update(text).digest("hex"),
    size: Buffer.byteLength(text, "utf8"),
  };
}

function groupBy(records, key) {
  const grouped = new Map();
  for (const record of records) {
    const value = record[key];
    if (!value) continue;
    const group = grouped.get(value) ?? [];
    group.push(record);
    grouped.set(value, group);
  }
  return grouped;
}

function dateOnly(value) {
  return String(value ?? "").slice(0, 10);
}

function canonicalCode(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const tail = raw.split(/[\/#]/).filter(Boolean).at(-1) ?? raw;
  const normalized = tail.toLocaleLowerCase("es-CL").replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return normalized || null;
}

function rutDigit(body) {
  let factor = 2;
  let sum = 0;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  return remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
}

export function parseInfoLobbyLegalRut(value) {
  const match = String(value ?? "").trim().match(/^(\d{7,8})([0-9kK])r$/);
  if (!match || rutDigit(match[1]) !== match[2].toUpperCase()) return null;
  const body = match[1];
  const verifier = match[2].toUpperCase();
  const dotted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return { normalized: `${body}-${verifier}`, formatted: `${dotted}-${verifier}` };
}

function personDescriptor(code, name, role, sourceUrl) {
  const officialCode = canonicalCode(code);
  const cleanName = String(name ?? "").replace(/\s+/g, " ").trim();
  if (!officialCode || !cleanName) return null;
  return {
    id: `person-infolobby-${officialCode}`,
    kind: "person",
    name: cleanName,
    identifiers: [{ scheme: "infolobby-person-code", value: String(code).trim(), isPublic: true, sourceUrl }],
    attributes: { role: role || null, country: "CL" },
  };
}

function bodyDescriptor(code, name, sourceUrl) {
  const officialCode = canonicalCode(code);
  const cleanName = String(name ?? "").replace(/\s+/g, " ").trim();
  if (!officialCode || !cleanName) return null;
  return {
    id: `public-body-infolobby-${officialCode}`,
    kind: "public_body",
    name: cleanName,
    identifiers: [{ scheme: "infolobby-public-body-code", value: String(code).trim(), isPublic: true, sourceUrl }],
    attributes: { country: "CL" },
  };
}

function legalDescriptor(code, name, sourceUrl, attributes = {}) {
  const officialCode = canonicalCode(code);
  const rut = parseInfoLobbyLegalRut(code);
  const cleanName = String(name ?? "").replace(/\s+/g, " ").trim()
    .replace(/\s+rut\s+\d{1,2}\.?\d{3}\.?\d{3}-[0-9kK]\s*$/i, "").trim();
  if (!officialCode || !cleanName) return null;
  return {
    id: rut ? `legal-cl-${rut.normalized.replace("-", "").toLocaleLowerCase("es-CL")}` : `legal-infolobby-${officialCode}`,
    kind: "legal_entity",
    name: cleanName,
    ...(rut ? { rut_juridico: rut.formatted } : {}),
    identifiers: [
      { scheme: "infolobby-entity-code", value: String(code).trim(), isPublic: true, sourceUrl },
      ...(rut ? [{ scheme: "CL-RUT", value: rut.formatted, isPublic: true, sourceUrl }] : []),
    ],
    attributes: { ...attributes, country: "CL" },
  };
}

function uniqueEntities(entities) {
  return [...new Map(entities.filter(Boolean).map((entity) => [entity.id, entity])).values()];
}

function ids(entities) {
  return [...new Set(entities.filter(Boolean).map((entity) => entity.id))];
}

export function projectLobbyQuarter(datasets, from, to) {
  const details = groupBy(datasets.datosAudiencia.rows, "codigoAudiencia");
  const active = groupBy(datasets.asistenciasActivos.rows, "codigoAudiencia");
  const passive = groupBy(datasets.asistenciasPasivos.rows, "codigoAudiencia");
  const represented = groupBy(datasets.representaciones.rows, "codigoAudiencia");
  const employers = groupBy(datasets.trabajaPara.rows, "codigoAudiencia");
  const others = groupBy(datasets.otrosAsistentes.rows, "codigoAudiencia");
  const records = [];

  for (const row of datasets.audiencias.rows) {
    const date = dateOnly(row.fechaEvento);
    if (date < from || date > to) continue;
    const audienceId = row.CodigoURI;
    const passiveRows = passive.get(audienceId) ?? [];
    const activeRows = active.get(audienceId) ?? [];
    const representedRows = represented.get(audienceId) ?? [];
    const employerRows = employers.get(audienceId) ?? [];
    const publicBody = bodyDescriptor(
      passiveRows[0]?.codigoOrganismo || row.uriOrganismo,
      passiveRows[0]?.organismo || row.organismo,
      datasets.audiencias.url,
    );
    const passiveEntities = passiveRows.map((item) => personDescriptor(item.codigoPasivo, item.pasivo, item.cargo, datasets.asistenciasPasivos.url));
    const activeEntities = activeRows.map((item) => personDescriptor(item.codigoActivo, item.activo, "Sujeto activo", datasets.asistenciasActivos.url));
    const companyEntities = [
      ...activeRows.map((item) => legalDescriptor(item.codigoEmpLobby, item.empresaLobby, datasets.asistenciasActivos.url, { relationship: "empresa_lobby" })),
      ...employerRows.map((item) => legalDescriptor(item.codigoEmpLobby, item.empresaLobby, datasets.trabajaPara.url, { relationship: "empleador" })),
    ];
    const representedEntities = [
      ...activeRows.map((item) => legalDescriptor(item.codigoRepresentado, item.representado, datasets.asistenciasActivos.url, { relationship: "representado", business_activity: item.giroRepresentado || null })),
      ...representedRows.filter((item) => /jur[ií]dica/i.test(item.personalidad ?? "") || parseInfoLobbyLegalRut(item.codigoRepresentado))
        .map((item) => legalDescriptor(item.codigoRepresentado, item.representado, datasets.representaciones.url, { relationship: "representado", legal_personality: item.personalidad || null, business_activity: item.giroRepresentado || null })),
    ];
    const entities = uniqueEntities([publicBody, ...passiveEntities, ...activeEntities, ...companyEntities, ...representedEntities]);
    records.push(sanitizeForPublication({
      id: row.uriAudiencia || row.CodigoURI,
      kind: "lobby",
      lobby_event_kind: "audience",
      fecha: date,
      organismo_id: row.uriOrganismo,
      organismo: row.organismo,
      comuna_id: row.uriComuna,
      comuna: row.comuna,
      modalidad: row.tipo,
      duracion_minutos: row.duracionMinutos,
      detalle: details.get(audienceId) ?? [],
      sujetos_activos: activeRows,
      sujetos_pasivos: passiveRows,
      representaciones: representedRows,
      empleadores: employerRows,
      otros_asistentes: others.get(audienceId) ?? [],
      entities,
      subject_entity_ids: ids(passiveEntities.length ? passiveEntities : activeEntities),
      object_entity_ids: ids([publicBody, ...activeEntities, ...companyEntities, ...representedEntities]),
      url: row.uriAudiencia,
      source_url: datasets.audiencias.url,
      fuente: "InfoLobby · Consejo para la Transparencia (catálogo CSV CC BY 4.0)",
    }));
  }

  for (const row of datasets.viajes.rows) {
    const start = dateOnly(row.fechaInicio);
    const end = dateOnly(row.fechaTermino) || start;
    if (start < from || start > to) continue;
    const person = personDescriptor(row.codigoPasivo, row.pasivo, row.cargo, datasets.viajes.url);
    const publicBody = bodyDescriptor(row.IdOrPortal, row.organismo, datasets.viajes.url);
    records.push(sanitizeForPublication({
      id: row.codigoViaje,
      kind: "lobby",
      lobby_event_kind: "travel",
      fecha: start,
      fecha_termino: end,
      sujeto_pasivo_id: row.codigoPasivo,
      sujeto_pasivo: row.pasivo,
      organismo: row.organismo,
      organismo_id: row.IdOrPortal,
      cargo: row.cargo,
      destino: row.destino,
      descripcion: row.descripcion,
      costo_original: row.costo,
      financistas: row.financistas,
      entities: uniqueEntities([person, publicBody]),
      subject_entity_ids: ids([person]),
      object_entity_ids: ids([publicBody]),
      url: datasets.viajes.url,
      fuente: "InfoLobby · Consejo para la Transparencia (catálogo CSV CC BY 4.0)",
    }));
  }

  for (const row of datasets.donativos.rows) {
    const date = dateOnly(row.fechaDonativo);
    if (date < from || date > to) continue;
    const person = personDescriptor(row.codigoPasivo, row.pasivo, row.cargo, datasets.donativos.url);
    const publicBody = bodyDescriptor(row.IdOrPortal, row.organismo, datasets.donativos.url);
    records.push(sanitizeForPublication({
      id: row.codigoDonativo,
      kind: "lobby",
      lobby_event_kind: "gift",
      fecha: date,
      sujeto_pasivo_id: row.codigoPasivo,
      sujeto_pasivo: row.pasivo,
      organismo: row.organismo,
      organismo_id: row.IdOrPortal,
      cargo: row.cargo,
      descripcion: row.descripcion,
      ocasion: row.ocasion,
      entities: uniqueEntities([person, publicBody]),
      subject_entity_ids: ids([person]),
      object_entity_ids: ids([publicBody]),
      url: datasets.donativos.url,
      fuente: "InfoLobby · Consejo para la Transparencia (catálogo CSV CC BY 4.0)",
    }));
  }
  return records;
}

export async function fetchInfoLobbyBundle({ from, to, fetchImpl = fetch, timeoutMs = 120_000, retries = 3, retryDelayMs = 1_000, datasetConcurrency = 2, onProgress = null }) {
  const availableResponse = await fetchImpl(`${LOBBY_CATALOG_ROOT}/trimestres`, {
    headers: { Accept: "application/json", "User-Agent": "TransparenciaChile-ETL/3.0" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!availableResponse.ok) throw new Error(`INFOLOBBY_PERIODS_HTTP_${availableResponse.status}`);
  const available = await availableResponse.json();
  if (!Array.isArray(available)) throw new Error("INVALID_INFOLOBBY_PERIODS_SCHEMA");
  const availableKeys = new Set(available.map((period) => `${period.anio}-${period.trimestre}`));
  const all = [];
  const originals = [];
  for (const period of requestedQuarters(from, to)) {
    if (!availableKeys.has(`${period.year}-${period.quarter}`)) continue;
    let completed = 0;
    const entries = await mapWithConcurrency(LOBBY_DATASETS, datasetConcurrency, async (dataset) => {
      try {
        const result = await fetchLobbyDataset(period.year, period.quarter, dataset, fetchImpl, timeoutMs, retries, retryDelayMs);
        completed += 1;
        onProgress?.({ phase: "datasets", year: period.year, quarter: period.quarter, completed, total: LOBBY_DATASETS.length, dataset });
        return [dataset, result];
      } catch (error) {
        if (!LOBBY_AUXILIARY_DATASETS.has(dataset)) throw error;
        completed += 1;
        const message = error instanceof Error ? error.message : String(error);
        onProgress?.({ phase: "datasets", year: period.year, quarter: period.quarter, completed, total: LOBBY_DATASETS.length, dataset, error: message });
        return [dataset, {
          url: createInfoLobbyDatasetUrl(period.year, period.quarter, dataset),
          rows: [],
          checksumSha256: null,
          size: 0,
          error: message,
        }];
      }
    });
    const datasets = Object.fromEntries(entries);
    all.push(...projectLobbyQuarter(datasets, from, to));
    const datasetMetadata = LOBBY_DATASETS.map((dataset) => ({
      dataset,
      url: datasets[dataset].url,
      checksumSha256: datasets[dataset].checksumSha256,
      size: datasets[dataset].size,
      rowCount: datasets[dataset].rows.length,
      ...(datasets[dataset].error ? { error: datasets[dataset].error } : {}),
    }));
    const fingerprint = `${stableStringify({ year: period.year, quarter: period.quarter, datasets: datasetMetadata })}\n`;
    originals.push({
      year: period.year,
      quarter: period.quarter,
      datasets: datasetMetadata,
      checksumSha256: createHash("sha256").update(fingerprint).digest("hex"),
      size: datasetMetadata.reduce((total, dataset) => total + dataset.size, 0),
      url: `${LOBBY_CATALOG_ROOT}/Datasets/${period.year}/${period.quarter}`,
    });
  }
  const records = all.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const recordIds = new Set(records.map((record) => record.id));
  if (recordIds.size !== records.length) throw new Error("INFOLOBBY_DUPLICATE_RECORD");
  return { sourceId: "infolobby", records, originals };
}

export async function fetchInfoLobby(options) {
  return (await fetchInfoLobbyBundle(options)).records;
}
