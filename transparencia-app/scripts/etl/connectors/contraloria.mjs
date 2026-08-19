import { createHash } from "node:crypto";

export const CGR_INDEX_URL = "https://www.contraloria.cl/web/cgr/ultimas-auditorias-por-sector-y-region";
export const CGR_CONSOLIDATED_API_URL = "https://www.contraloria.cl/apibusca/search/consolidados";

export const CGR_CENTRAL_AREAS = [
  "Agricultura", "Defensa Nacional", "Economía y Fomento", "Hacienda", "Justicia", "Minería",
  "Previsión social", "Trabajo", "Transporte", "Vivienda y Urbanismo",
  "Empresas Públicas y Sociedades del Estado",
  "Presidencia, Secretaría General de Gobierno y Secretaría General de la Presidencia",
  "Relaciones Exteriores", "Cultura", "Bienes Nacionales", "Desarrollo Social", "Educación", "Energía",
  "Interior y Seguridad Pública", "Medio Ambiente", "Obras Públicas", "Salud", "Turismo", "Telecomunicaciones",
  "Municipalidades y Corporaciones Municipales R.M.", "Contraloría General de la República", "Ciencia",
];

export const CGR_REGIONS = [
  { id: "1", name: "Tarapacá" }, { id: "2", name: "Antofagasta" }, { id: "3", name: "Atacama" },
  { id: "4", name: "Coquimbo" }, { id: "5", name: "Valparaíso" }, { id: "6", name: "OHiggins" },
  { id: "7", name: "Maule" }, { id: "8", name: "Bio-Bío" }, { id: "9", name: "Araucanía" },
  { id: "10", name: "Los Lagos" }, { id: "11", name: "Aysén" }, { id: "12", name: "Magallanes" },
  { id: "13", name: "Metropolitana" }, { id: "14", name: "Los Ríos" },
  { id: "15", name: "Arica y Parinacota" }, { id: "16", name: "Ñuble" },
];

function isoDate(value) {
  const match = String(value ?? "").trim().match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (!match) throw new Error(`CGR_INVALID_DATE: ${value}`);
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function reportIdentity(number, title) {
  const normalized = String(number ?? "").trim().match(/^(\d+)\/(\d{4})$/);
  if (!normalized) throw new Error(`CGR_INVALID_REPORT_NUMBER: ${number}`);
  const digest = createHash("sha256").update(`${normalized[1]}/${normalized[2]}|${title}`).digest("hex").slice(0, 16);
  return { number: normalized[1], year: Number(normalized[2]), id: `cgr-audit-${normalized[2]}-${normalized[1]}-${digest}` };
}

function auditedService(raw) {
  const name = raw.service?.trim();
  if (!name) return null;
  const digest = createHash("sha256").update(name.normalize("NFKC").toLocaleUpperCase("es-CL")).digest("hex").slice(0, 16);
  return { id: `public-body-cgr-service-${digest}`, kind: "public_body", name };
}

export function normalizeCgrReport(raw) {
  if (!raw?.title || !raw?.sourceUrl || !raw?.area) throw new Error("CGR_INVALID_SCHEMA");
  const identity = reportIdentity(raw.reportNumber, raw.title);
  const fecha = isoDate(raw.publishedDate);
  const service = auditedService(raw);
  const cgr = { id: "public-body-cgr", kind: "public_body", name: "Contraloría General de la República" };
  return {
    id: identity.id,
    fecha,
    period: fecha.slice(0, 7),
    kind: "audit",
    title: raw.title.trim(),
    description: raw.reportType?.trim() || null,
    report_number: `${identity.number}/${identity.year}`,
    report_year: identity.year,
    published_at: fecha,
    report_type: raw.reportType?.trim() || null,
    level: raw.level?.trim() || "Central",
    cgr_unit: raw.unit?.trim() || null,
    area: raw.area.trim(),
    region: raw.region?.trim() || null,
    service: service?.name ?? null,
    status: "published",
    objectives: raw.objectives?.trim() || null,
    scope_universe: raw.universe?.trim() || null,
    sample: raw.sample?.trim() || null,
    conclusions: raw.conclusions?.trim() || null,
    findings: raw.findings?.length ? raw.findings.filter((finding) => finding?.text?.trim() && Number.isInteger(finding.page) && finding.page > 0) : [],
    document_locator: {
      report_number: `${identity.number}/${identity.year}`,
      document_id: raw.documentId ?? null,
      page: raw.findings?.find((finding) => Number.isInteger(finding.page) && finding.page > 0)?.page ?? null,
    },
    document_checksum_sha256: raw.documentChecksumSha256 ?? null,
    document_size: Number.isSafeInteger(raw.documentSize) ? raw.documentSize : null,
    document_page_count: Number.isSafeInteger(raw.documentPageCount) ? raw.documentPageCount : null,
    document_error: raw.documentError ?? null,
    amount: null,
    entities: [cgr, ...(service ? [service] : [])],
    subject_entity_ids: [cgr.id],
    object_entity_ids: service ? [service.id] : [],
    relations: service ? [{ fromId: cgr.id, predicate: "audited", toId: service.id, method: "official_service_field" }] : [],
    url: raw.sourceUrl,
    fuente: "Contraloría General de la República · Sistema de Informes de Control",
    license: "Documento público oficial; redistribución no presumida",
    reconciliation_method: "official_report_number",
  };
}

export function normalizeCgrReports(rawReports) {
  const records = rawReports.map(normalizeCgrReport);
  const ids = new Set(records.map((record) => record.id));
  if (ids.size !== records.length) throw new Error("CGR_DUPLICATE_REPORT");
  return records.sort((a, b) => a.id.localeCompare(b.id));
}

const CONSOLIDATED_TYPES = {
  CIC: "Consolidado de Información Circularizada",
  CRA: "Consolidado de Resultados de Auditoría",
  RADAR: "Reporte de análisis de datos de alerta de riesgo",
};

function consolidatedIdentity(value) {
  const match = String(value ?? "").trim().toUpperCase().match(/^(CIC|CRA|RADAR)(\d+)\/(\d{4})$/);
  if (!match) throw new Error(`CGR_INVALID_CONSOLIDATED_NUMBER: ${value}`);
  return { prefix: match[1], sequence: Number(match[2]), year: Number(match[3]), id: `cgr-${match[1].toLowerCase()}-${match[3]}-${match[2]}` };
}

export function normalizeCgrConsolidatedProduct(raw) {
  if (!raw?.officialId || !raw?.number || !raw?.title || !raw?.publishedAt || !raw?.productType || !raw?.sourceUrl) throw new Error("CGR_INVALID_CONSOLIDATED_SCHEMA");
  const identity = consolidatedIdentity(raw.number);
  if (CONSOLIDATED_TYPES[identity.prefix] !== raw.productType) throw new Error(`CGR_CONSOLIDATED_TYPE_MISMATCH: ${raw.number}`);
  const source = new URL(raw.sourceUrl);
  if (source.protocol !== "https:" || source.hostname !== "www.contraloria.cl") throw new Error("CGR_INVALID_CONSOLIDATED_URL");
  const fecha = new Date(raw.publishedAt).toISOString().slice(0, 10);
  const cgr = { id: "public-body-cgr", kind: "public_body", name: "Contraloría General de la República" };
  return {
    id: identity.id, fecha, period: fecha.slice(0, 7), kind: "audit",
    title: raw.title.trim(), description: raw.summary?.trim() || null,
    report_number: `${identity.prefix}${identity.sequence}/${identity.year}`, report_year: identity.year,
    published_at: fecha, report_type: raw.productType, cgr_product_type: identity.prefix.toLowerCase(),
    cgr_unit: raw.unit?.trim() || null, area: raw.sector?.trim() || "Sin sector publicado", region: null,
    service: null, status: "published", objectives: raw.summary?.trim() || null,
    scope_universe: null, sample: null, conclusions: raw.summary?.trim() || null,
    findings: raw.findings?.length ? raw.findings.filter((finding) => finding?.text?.trim() && Number.isInteger(finding.page) && finding.page > 0) : [],
    document_locator: { report_number: `${identity.prefix}${identity.sequence}/${identity.year}`, document_id: String(raw.officialId), page: raw.findings?.[0]?.page ?? null },
    document_checksum_sha256: raw.documentChecksumSha256 ?? null,
    document_size: Number.isSafeInteger(raw.documentSize) ? raw.documentSize : null,
    document_page_count: Number.isSafeInteger(raw.documentPageCount) ? raw.documentPageCount : null,
    document_error: raw.documentError ?? null, amount: null,
    printable_document_url: raw.printableDocumentUrl ?? null,
    entities: [cgr], subject_entity_ids: [cgr.id], object_entity_ids: [], relations: [],
    url: source.toString(), fuente: "Contraloría General de la República · API Buscador CIC/CRA/RADAR",
    license: "Documento público oficial; redistribución no presumida", reconciliation_method: "official_cgr_product_id",
  };
}

export function normalizeCgrConsolidatedProducts(rawProducts) {
  const records = rawProducts.map(normalizeCgrConsolidatedProduct);
  if (new Set(records.map((record) => record.id)).size !== records.length) throw new Error("CGR_DUPLICATE_CONSOLIDATED_PRODUCT");
  return records.sort((a, b) => a.id.localeCompare(b.id));
}
