export const CGR_WIDGET_URL = "https://www.contraloria.cl/buscador/widget.js";
export const CGR_AUDIT_SEARCH_URL = "https://www.contraloria.cl/apibusca/search/auditoria";

export function buildCgrDetailUrl(documentId) {
  if (typeof documentId !== "string" || documentId.trim() === "") throw new Error("CGR_MISSING_OFFICIAL_DOCUMENT_ID");
  const url = new URL("https://www.contraloria.cl/SicaProd/SICAv3-BIFAPortalCGR/faces/newDetalleInforme");
  url.searchParams.set("docIdcm", documentId.trim());
  return url.toString();
}
function comparable(value) {
  return String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleUpperCase("es-CL");
}

function canonicalIdentityPart(value) {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleUpperCase("es-CL").replace(/[^A-Z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function cgrReconciliationKey(record) {
  const reportNumber = record?.reportNumber ?? record?.data?.data?.report_number ?? record?.data?.report_number;
  const publishedAt = record?.publishedAt ?? record?.occurredAt ?? record?.data?.data?.fecha;
  const service = record?.service ?? record?.data?.data?.service ?? record?.data?.service;
  const date = isoDate(publishedAt);
  if (!reportNumber || !date || !service) return null;
  const numberKey = canonicalIdentityPart(reportNumber);
  const serviceKey = canonicalIdentityPart(service);
  if (!numberKey || !serviceKey) return null;
  return `${numberKey}|${date}|${serviceKey}`;
}

function isoDate(value) {
  const raw = String(value ?? "").trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const spanish = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return spanish ? `${spanish[3]}-${spanish[2]}-${spanish[1]}` : "";
}

export function compareCgrSearchAndDetail(candidate, fields) {
  const comparisons = [
    ["Número", candidate.reportNumber, fields?.Número],
    ["Fecha", isoDate(candidate.publishedAt), isoDate(fields?.Fecha)],
    ["Tipo de Informe", candidate.reportType, fields?.["Tipo de Informe"]],
    ["Unidad CGR", candidate.unit, fields?.["Unidad CGR"]],
    ["Servicio", candidate.service, fields?.Servicio],
    ["Nombre de Informe", candidate.title, fields?.["Nombre de Informe"]],
  ];
  const mismatches = comparisons
    .filter(([, expected, actual]) => !expected || !actual || comparable(expected) !== comparable(actual))
    .map(([label]) => label);
  return { matched: mismatches.length === 0, mismatches };
}

export function projectCgrAuditHit(hit) {
  const source = hit?._source ?? {};
  let documentUrl = null;
  let documentId = null;
  if (source.pdf) {
    let url;
    try { url = new URL(source.pdf); } catch { throw new Error("CGR_INVALID_DOCUMENT_URL"); }
    if (url.protocol !== "https:" || url.hostname !== "www.contraloria.cl") throw new Error("CGR_INVALID_DOCUMENT_URL");
    documentUrl = url.toString();
    documentId = url.searchParams.get("docIdcm");
  }
  return {
    id: String(hit?._id ?? ""),
    reportNumber: String(source["número"] ?? "").trim(),
    publishedAt: String(source.fecha_documento ?? "").slice(0, 10),
    unit: String(source.unidad_cgr ?? source.unidad_cgr_raw ?? "").trim(),
    reportType: String(source.tipo ?? "").trim(),
    service: String(source.servicio_ ?? source.servicio_raw ?? "").trim(),
    title: String(source.nombre ?? "").trim(),
    documentId,
    documentUrl,
  };
}

function parseMonth(month) {
  const match = String(month ?? "").match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) throw new Error(`CGR_INVALID_MONTH: ${month}`);
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { first: `${match[1]}-${match[2]}-01`, last: `${match[1]}-${match[2]}-${String(lastDay).padStart(2, "0")}` };
}

export function collectCgrUnitOptions(widgetSource) {
  const match = String(widgetSource ?? "").match(/name:"Unidad",options:\[([\s\S]*?)\],field:"unidad_cgr"/);
  if (!match) throw new Error("CGR_UNIT_FILTER_NOT_FOUND_IN_OFFICIAL_WIDGET");
  const options = [...match[1].matchAll(/"((?:\\.|[^"\\])*)"/g)]
    .map((entry) => JSON.parse(`"${entry[1]}"`));
  const unique = [...new Set(options.map((option) => option.trim()).filter(Boolean))];
  if (unique.length === 0) throw new Error("CGR_UNIT_FILTER_HAS_NO_OPTIONS");
  return unique;
}

export function buildCgrSearchBody({ month, unit, page = 0 }) {
  const range = parseMonth(month);
  if (!Number.isSafeInteger(page) || page < 0) throw new Error(`CGR_INVALID_PAGE: ${page}`);
  const options = [
    { type: "date", field: "fecha_documento", value: { gt: range.first, lt: range.last }, dir: "gt" },
  ];
  if (unit !== undefined && unit !== null) {
    if (typeof unit !== "string" || unit.trim() === "") throw new Error("CGR_INVALID_UNIT_FILTER");
    options.push({ type: "category", field: "unidad_cgr", value: unit });
  }
  return { search: "", exact_search: false, options, order: null, date_name: "fecha_documento", source: "auditoria", page };
}

function idsOf(run) {
  return (run.hits ?? []).map((hit) => hit.id).filter(Boolean).sort();
}

function runIsComplete(run) {
  return Number.isSafeInteger(run.declaredTotal)
    && run.declaredTotal >= 0
    && Array.isArray(run.hits)
    && run.hits.length === run.declaredTotal
    && run.hits.every((hit) => typeof hit.id === "string" && hit.id.length > 0);
}

export function compareCgrSegmentRuns(runs) {
  const byUnit = new Map();
  for (const run of runs) {
    const group = byUnit.get(run.unit) ?? [];
    group.push(run);
    byUnit.set(run.unit, group);
  }
  const unstableUnits = [];
  const incompleteUnits = [];
  for (const [unit, unitRuns] of byUnit) {
    if (unitRuns.some((run) => !runIsComplete(run))) incompleteUnits.push(unit);
    if (unitRuns.length !== 2 || idsOf(unitRuns[0]).join("\n") !== idsOf(unitRuns[1]).join("\n")) unstableUnits.push(unit);
  }
  return {
    stable: unstableUnits.length === 0 && incompleteUnits.length === 0,
    unstableUnits: unstableUnits.sort(),
    incompleteUnits: incompleteUnits.sort(),
  };
}

export function summarizeCgrSegments(runs) {
  const ids = new Set();
  let summedSegmentHits = 0;
  let complete = true;
  for (const run of runs) {
    summedSegmentHits += run.hits?.length ?? 0;
    complete &&= runIsComplete(run);
    for (const hit of run.hits ?? []) if (hit.id) ids.add(hit.id);
  }
  return {
    uniqueIds: ids.size,
    summedSegmentHits,
    overlapIds: summedSegmentHits - ids.size,
    complete,
    ids: [...ids].sort(),
  };
}

