import { createHash } from "node:crypto";
import { SaxesParser } from "saxes";
import { Unzip, UnzipInflate, unzipSync } from "fflate";

export const SERVEL_RESULTS_PAGE = "https://www.servel.cl/resultados-preliminares-eleccion-presidencial-y-parlamentarias-2025/";
export const SERVEL_DATASETS = {
  president: {
    url: "https://www.servel.cl/wp-content/uploads/2025/11/PRELIMINARES_PRESIDENTE_DE_LA_REPUBLICA.zip",
    originalName: "PRELIMINARES_PRESIDENTE_DE_LA_REPUBLICA.zip",
  },
  deputies: {
    url: "https://www.servel.cl/wp-content/uploads/2025/11/PRELIMINARES_DIPUTADOS.zip",
    originalName: "PRELIMINARES_DIPUTADOS.zip",
  },
  senators: {
    url: "https://www.servel.cl/wp-content/uploads/2025/11/PRELIMINARES_SENADORES_CIRCUNSCRIPCION.zip",
    originalName: "PRELIMINARES_SENADORES_CIRCUNSCRIPCION.zip",
  },
};

const REQUIRED_HEADERS = [
  "cod_local_votacion", "local_votacion", "cod_mesa", "electores", "mesa",
  "nro_en_voto", "nombre_candidato", "vocales", "form_40",
];
const CONTEST_LABELS = {
  president: "Elección presidencial",
  deputies: "Elección de diputados y diputadas",
  senators: "Elección de senadores y senadoras",
};
const MAX_DOWNLOAD_BYTES = 500 * 1024 * 1024;
const MAX_ARCHIVE_WORKBOOK_BYTES = 250 * 1024 * 1024;
const MAX_ARCHIVE_TOTAL_BYTES = 500 * 1024 * 1024;
const MAX_SHARED_STRINGS_XML_BYTES = 128 * 1024 * 1024;
const MAX_WORKSHEET_XML_BYTES = 750 * 1024 * 1024;

function contestConfig(contest) {
  const config = SERVEL_DATASETS[contest];
  if (!config) throw new Error(`SERVEL_UNKNOWN_CONTEST: ${contest}`);
  return config;
}

function officialCode(value, field) {
  const normalized = typeof value === "number" && Number.isSafeInteger(value)
    ? String(value)
    : String(value ?? "").trim();
  if (!/^\d+$/.test(normalized)) throw new Error(`SERVEL_INVALID_${field.toUpperCase()}`);
  return normalized;
}

function nonNegativeInteger(value, field) {
  const number = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isSafeInteger(number) || number < 0) throw new Error(`SERVEL_INVALID_${field.toUpperCase()}`);
  return number;
}

function optionalText(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || null;
}

export function normalizeServelRow(row, { contest, sourceUrl, workbookName }) {
  contestConfig(contest);
  const tableCode = officialCode(row.cod_mesa, "table_code");
  const candidateCode = row.cod_candidato == null || row.cod_candidato === "" ? null : officialCode(row.cod_candidato, "candidate_code");
  const candidateName = optionalText(row.nombre_candidato);
  if (!candidateName) throw new Error("SERVEL_INVALID_CANDIDATE_NAME");
  const votes = nonNegativeInteger(row.votos_preliminares ?? row.votos, "votes");
  const electors = nonNegativeInteger(row.electores, "electors");
  const electedValue = row.electo_nominado == null ? 0 : nonNegativeInteger(row.electo_nominado, "elected_flag");
  const localCode = officialCode(row.cod_local_votacion, "polling_place_code");
  const candidateEntityId = candidateCode ? `servel-candidate-${candidateCode}` : null;
  const ballotPosition = nonNegativeInteger(row.nro_en_voto, "ballot_position");
  const evidenceLocator = optionalText(row.form_40);
  if (!evidenceLocator) throw new Error("SERVEL_MISSING_FORM_40");

  return {
    id: `servel-2025-${contest}-${tableCode}-${candidateCode ?? `option-${ballotPosition}`}`,
    fecha: "2025-11-16",
    period: "2025-11",
    kind: "vote",
    status: "preliminary",
    title: `${CONTEST_LABELS[contest]} · ${candidateName}`,
    description: "Resultado preliminar por mesa informado por SERVEL. No corresponde al escrutinio definitivo de los tribunales electorales.",
    contest,
    votes,
    option_name: candidateName,
    candidate: candidateEntityId ? {
      entity_id: candidateEntityId,
      official_id: candidateCode,
      name: candidateName,
      role: "Candidato/a",
    } : null,
    subject_entity_ids: candidateEntityId ? [candidateEntityId] : [],
    object_entity_ids: [],
    geography: {
      region: optionalText(row.region),
      senatorial_constituency: optionalText(row.circunscripcion_senatorial),
      district: optionalText(row.distrito),
      commune: optionalText(row.comuna),
      continent: optionalText(row.continente),
      country: optionalText(row.pais),
      consulate: optionalText(row.consulado),
      electoral_constituency: optionalText(row.circunscripcion),
    },
    polling_place: {
      official_id: localCode,
      name: optionalText(row.local_votacion),
      counting_college_id: row.cod_colegio_escrutador == null ? null : officialCode(row.cod_colegio_escrutador, "counting_college_code"),
      counting_college: optionalText(row.colegio_escrutador),
      counting_college_seat: optionalText(row.sede_colegio_escrutador),
    },
    table: {
      official_id: tableCode,
      number: nonNegativeInteger(row.mesa, "table_number"),
      electors,
      officials: nonNegativeInteger(row.vocales, "table_officials"),
      incident: optionalText(row.incidencia_mesa),
    },
    ballot: {
      position: ballotPosition,
      pact_letter: optionalText(row.letra_pacto),
      pact: optionalText(row.pacto),
      subpact: optionalText(row.subpacto),
      party: optionalText(row.partido),
    },
    nominated_elected: electedValue > 0,
    nomination_status_code: electedValue,
    evidence_locator: evidenceLocator,
    workbook: workbookName,
    url: sourceUrl,
    fuente: "Servicio Electoral de Chile (SERVEL)",
    license: "Información pública oficial; redistribución de originales no presumida",
    reconciliation_method: candidateEntityId ? "official_servel_candidate_code" : "official_servel_ballot_summary_code",
  };
}

function localName(name) {
  return name.includes(":") ? name.slice(name.lastIndexOf(":") + 1) : name;
}

function parseSharedStrings(bytes) {
  let files;
  try {
    files = unzipSync(bytes, { filter: (file) => {
      if (file.name !== "xl/sharedStrings.xml") return false;
      if (file.originalSize > MAX_SHARED_STRINGS_XML_BYTES) throw new Error("SERVEL_SHARED_STRINGS_TOO_LARGE");
      return true;
    } });
  } catch (error) {
    throw new Error(`SERVEL_INVALID_XLSX: ${error instanceof Error ? error.message : String(error)}`);
  }
  const xml = files["xl/sharedStrings.xml"];
  if (!xml) return [];
  const values = [];
  let current = null;
  let collectingText = false;
  const parser = new SaxesParser();
  parser.on("opentag", (tag) => {
    const name = localName(tag.name);
    if (name === "si") current = "";
    if (name === "t" && current !== null) collectingText = true;
  });
  parser.on("text", (text) => { if (collectingText && current !== null) current += text; });
  parser.on("cdata", (text) => { if (collectingText && current !== null) current += text; });
  parser.on("closetag", (tag) => {
    const name = localName(tag.name);
    if (name === "t") collectingText = false;
    if (name === "si" && current !== null) {
      values.push(current);
      current = null;
    }
  });
  parser.on("error", (error) => { throw error; });
  parser.write(new TextDecoder().decode(xml)).close();
  return values;
}

function columnIndex(reference) {
  const letters = String(reference ?? "").match(/^[A-Z]+/i)?.[0]?.toUpperCase();
  if (!letters) throw new Error(`SERVEL_INVALID_CELL_REFERENCE: ${reference}`);
  let value = 0;
  for (const letter of letters) value = value * 26 + letter.charCodeAt(0) - 64;
  return value - 1;
}

function streamZipEntry(bytes, targetName, maxOutputBytes, onChunk) {
  let found = false;
  let outputBytes = 0;
  const unzip = new Unzip((file) => {
    if (file.name !== targetName) return;
    found = true;
    file.ondata = (error, chunk, final) => {
      if (error) throw error;
      outputBytes += chunk.byteLength;
      if (outputBytes > maxOutputBytes) throw new Error(`SERVEL_XLSX_ENTRY_TOO_LARGE: ${targetName}`);
      onChunk(chunk, final);
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  const chunkSize = 64 * 1024;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, bytes.length);
    unzip.push(bytes.subarray(offset, end), end === bytes.length);
  }
  if (!found) throw new Error(`SERVEL_XLSX_ENTRY_NOT_FOUND: ${targetName}`);
}

function decodeCell(cell, sharedStrings) {
  const raw = cell.text;
  if (raw === "") return null;
  if (cell.type === "s") {
    const index = Number(raw);
    if (!Number.isSafeInteger(index) || sharedStrings[index] === undefined) throw new Error("SERVEL_INVALID_SHARED_STRING");
    return sharedStrings[index];
  }
  if (cell.type === "inlineStr" || cell.type === "str") return raw;
  if (cell.type === "b") return raw === "1";
  const number = Number(raw);
  return Number.isFinite(number) ? number : raw;
}

export function parseServelWorkbook(bytes, { contest, sourceUrl, workbookName, onRecord = null }) {
  contestConfig(contest);
  const sharedStrings = parseSharedStrings(bytes);
  const records = [];
  let headers = null;
  let currentRow = null;
  let currentCell = null;
  let collectingValue = false;
  let recordCount = 0;
  const parser = new SaxesParser();
  parser.on("opentag", (tag) => {
    const name = localName(tag.name);
    if (name === "row") currentRow = [];
    if (name === "c") currentCell = { reference: tag.attributes.r ?? "", type: tag.attributes.t ?? "", text: "" };
    if ((name === "v" || name === "t") && currentCell) collectingValue = true;
  });
  parser.on("text", (text) => { if (collectingValue && currentCell) currentCell.text += text; });
  parser.on("cdata", (text) => { if (collectingValue && currentCell) currentCell.text += text; });
  parser.on("closetag", (tag) => {
    const name = localName(tag.name);
    if (name === "v" || name === "t") collectingValue = false;
    if (name === "c" && currentCell && currentRow) {
      currentRow[columnIndex(currentCell.reference)] = decodeCell(currentCell, sharedStrings);
      currentCell = null;
    }
    if (name === "row" && currentRow) {
      if (!headers) {
        headers = currentRow.map((value) => String(value ?? "").trim());
        const hasVotes = headers.includes("votos_preliminares") || headers.includes("votos");
        const hasTerritory = headers.includes("region") || headers.includes("continente") || headers.includes("pais");
        if (new Set(headers).size !== headers.length || REQUIRED_HEADERS.some((header) => !headers.includes(header)) || !hasVotes || !hasTerritory) {
          throw new Error(`SERVEL_INVALID_HEADERS: ${workbookName}`);
        }
      } else if (currentRow.some((value) => value !== null && value !== undefined && value !== "")) {
        const row = Object.fromEntries(headers.map((header, index) => [header, currentRow[index] ?? null]));
        const record = normalizeServelRow(row, { contest, sourceUrl, workbookName });
        if (onRecord) onRecord(record);
        else records.push(record);
        recordCount += 1;
      }
      currentRow = null;
    }
  });
  parser.on("error", (error) => { throw error; });
  const decoder = new TextDecoder();
  try {
    streamZipEntry(bytes, "xl/worksheets/sheet1.xml", MAX_WORKSHEET_XML_BYTES, (chunk, final) => {
      const text = decoder.decode(chunk, { stream: !final });
      if (text) parser.write(text);
      if (final) {
        const remainder = decoder.decode();
        if (remainder) parser.write(remainder);
        parser.close();
      }
    });
  } catch (error) {
    if (String(error instanceof Error ? error.message : error).startsWith("SERVEL_")) throw error;
    throw new Error(`SERVEL_INVALID_XLSX: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!headers) throw new Error(`SERVEL_EMPTY_WORKBOOK: ${workbookName}`);
  if (!recordCount) throw new Error(`SERVEL_EMPTY_WORKBOOK: ${workbookName}`);
  return records;
}

function addServelRecords(groups, records) {
  for (const record of records) {
    const territory = record.geography;
    const key = JSON.stringify([
      record.contest,
      record.candidate?.official_id ?? `option-${record.ballot.position}`,
      territory.region,
      territory.senatorial_constituency,
      territory.district,
      territory.commune,
      territory.continent,
      territory.country,
      territory.consulate,
      territory.electoral_constituency,
    ]);
    const group = groups.get(key) ?? {
      record: {
        ...record,
        id: `servel-2025-${record.contest}-${record.candidate?.official_id ?? `option-${record.ballot.position}`}-${createHash("sha256").update(key).digest("hex").slice(0, 16)}`,
        title: `${CONTEST_LABELS[record.contest]} · ${record.option_name} · ${territory.commune ?? territory.consulate ?? territory.country ?? territory.region ?? "territorio no informado"}`,
        description: "Suma reproducible de resultados preliminares por candidatura y comuna, calculada desde las mesas publicadas por SERVEL. No corresponde al escrutinio definitivo de los tribunales electorales.",
        votes: 0,
        electors: 0,
        tables_reported: 0,
        polling_places_reported: 0,
        official_forms_count: 0,
        source_workbooks: [],
        aggregation: {
          dimensions: ["contest", "candidate_or_summary_code", "region", "senatorial_constituency", "district", "commune", "continent", "country", "consulate", "electoral_constituency"],
          operation: "sum_votes_and_distinct_official_table_codes",
        },
      },
      tables: new Map(),
      pollingPlaces: new Set(),
      forms: new Set(),
      workbooks: new Set(),
    };
    if (group.tables.has(record.table.official_id)) {
      throw new Error(`SERVEL_DUPLICATE_TABLE_CANDIDATE: ${record.table.official_id}:${record.candidate?.official_id ?? record.ballot.position}`);
    }
    if (group.record.option_name !== record.option_name
      || group.record.ballot.position !== record.ballot.position
      || group.record.ballot.party !== record.ballot.party
      || group.record.ballot.pact !== record.ballot.pact) {
      throw new Error(`SERVEL_INCONSISTENT_CANDIDATE_METADATA: ${record.candidate?.official_id ?? record.ballot.position}`);
    }
    group.record.votes += record.votes;
    if (!Number.isSafeInteger(group.record.votes)) throw new Error("SERVEL_VOTE_TOTAL_OVERFLOW");
    group.tables.set(record.table.official_id, record.table.electors);
    group.pollingPlaces.add(record.polling_place.official_id);
    group.forms.add(record.evidence_locator);
    group.workbooks.add(record.workbook);
    group.record.nominated_elected ||= record.nominated_elected;
    groups.set(key, group);
  }
  return groups;
}

function finalizeServelGroups(groups) {
  return [...groups.values()].map((group) => ({
    ...group.record,
    electors: [...group.tables.values()].reduce((total, value) => total + value, 0),
    tables_reported: group.tables.size,
    polling_places_reported: group.pollingPlaces.size,
    official_forms_count: group.forms.size,
    source_workbooks: [...group.workbooks].sort((a, b) => a.localeCompare(b)),
    polling_place: undefined,
    table: undefined,
    evidence_locator: undefined,
    workbook: undefined,
  }));
}

export function aggregateServelRecords(records) {
  return finalizeServelGroups(addServelRecords(new Map(), records));
}

/**
 * @param {{
 *   contest: keyof typeof SERVEL_DATASETS,
 *   url?: string,
 *   fetchImpl?: typeof fetch,
 *   timeoutMs?: number,
 *   maxDownloadBytes?: number,
 * }} options
 */
export async function fetchServelPreliminaryResults({
  contest,
  url = contestConfig(contest).url,
  fetchImpl = fetch,
  timeoutMs = 120_000,
  maxDownloadBytes = MAX_DOWNLOAD_BYTES,
}) {
  const config = contestConfig(contest);
  const response = await fetchImpl(url, {
    headers: { Accept: "application/zip", "User-Agent": "TransparenciaChile-ETL/3.0" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`SERVEL_HTTP_${response.status}`);
  if (!Number.isSafeInteger(maxDownloadBytes) || maxDownloadBytes < 1) throw new Error("SERVEL_INVALID_DOWNLOAD_LIMIT");
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > maxDownloadBytes) throw new Error("SERVEL_DOWNLOAD_TOO_LARGE");
  if (!response.body) throw new Error("SERVEL_EMPTY_RESPONSE_BODY");
  const reader = response.body.getReader();
  const chunks = [];
  let downloadedBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    downloadedBytes += value.byteLength;
    if (downloadedBytes > maxDownloadBytes) {
      await reader.cancel();
      throw new Error("SERVEL_DOWNLOAD_TOO_LARGE");
    }
    chunks.push(value);
  }
  if (downloadedBytes === 0) throw new Error("SERVEL_INVALID_DOWNLOAD_SIZE");
  const originalBytes = new Uint8Array(downloadedBytes);
  let writeOffset = 0;
  for (const chunk of chunks) {
    originalBytes.set(chunk, writeOffset);
    writeOffset += chunk.byteLength;
  }
  let archive;
  try {
    let totalWorkbookBytes = 0;
    archive = unzipSync(originalBytes, { filter: (file) => {
      if (!/\.xlsx$/i.test(file.name)) return false;
      if (file.originalSize > MAX_ARCHIVE_WORKBOOK_BYTES) throw new Error(`SERVEL_WORKBOOK_TOO_LARGE: ${file.name}`);
      totalWorkbookBytes += file.originalSize;
      if (totalWorkbookBytes > MAX_ARCHIVE_TOTAL_BYTES) throw new Error("SERVEL_ARCHIVE_TOO_LARGE");
      return true;
    } });
  } catch (error) {
    throw new Error(`SERVEL_INVALID_ZIP: ${error instanceof Error ? error.message : String(error)}`);
  }
  const workbookNames = Object.keys(archive).filter((name) => /\.xlsx$/i.test(name)).sort((a, b) => a.localeCompare(b));
  if (!workbookNames.length) throw new Error("SERVEL_ZIP_WITHOUT_XLSX");
  const aggregateGroups = new Map();
  for (const workbookName of workbookNames) {
    parseServelWorkbook(archive[workbookName], {
      contest,
      sourceUrl: url,
      workbookName,
      onRecord: (record) => addServelRecords(aggregateGroups, [record]),
    });
  }
  const records = finalizeServelGroups(aggregateGroups);
  const ids = new Set(records.map((record) => record.id));
  if (ids.size !== records.length) throw new Error("SERVEL_DUPLICATE_RECORD");
  return {
    sourceId: "servel",
    dataset: contest,
    year: 2025,
    month: 11,
    period: "2025-11",
    records,
    original: {
      name: config.originalName,
      url,
      checksumSha256: createHash("sha256").update(originalBytes).digest("hex"),
      size: originalBytes.byteLength,
      license: "Información pública oficial; redistribución de originales no presumida",
      redistributable: false,
    },
  };
}
