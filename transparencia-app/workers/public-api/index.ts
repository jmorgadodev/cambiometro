import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

import { POLITICOS_SEED } from "../../lib/politicos-source";
import { readR2EvidenceRecords } from "../../lib/r2-records";
import { readR2EntityIndex } from "../../lib/r2-entities";

interface EmailSender {
  send(message: {
    to: string;
    from: string | { email: string; name: string };
    replyTo?: string;
    subject: string;
    text?: string;
    html?: string;
  }): Promise<unknown>;
}

export interface Env {
  DB?: D1Database;
  TRANSFERS_DB?: D1Database;
  PUBLIC_DATA?: R2Bucket;
  /**
   * Emergency-only switch for validating the dedicated D1 projection. The
   * public path remains R2-first so normal traffic does not consume the D1
   * free-tier rows_read quota.
   */
  PREFER_TRANSFER_D1?: string;
  EMAIL?: EmailSender;
  TURNSTILE_SECRET_KEY?: string;
  READ_ONLY_PREVIEW?: string;
  HEALTH_CHECK_D1?: string;
  EXPENSIVE_API_RATE_LIMITER?: { limit(input: { key: string }): Promise<{ success: boolean }> };
}

const PRIVACY_REQUEST_RECIPIENT = "Jorge.morgado.b@gmail.com";
const PRIVACY_REQUEST_SENDER = "solicitudes@impulsacv.cl";

type JsonRecord = Record<string, unknown>;

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=30, s-maxage=300, stale-while-revalidate=600",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Cambiometro-Uptime-Token",
  "Access-Control-Max-Age": "600",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(JSON_HEADERS);
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  return new Response(JSON.stringify(data), { ...init, headers });
}

function success(data: unknown, meta: JsonRecord = {}, links: JsonRecord = {}, status = 200) {
  return json({ data, meta, links }, { status });
}

function failure(code: string, message: string, status: number, details?: unknown) {
  return json({ error: { code, message, ...(details === undefined ? {} : { details }) } }, { status });
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

async function rateLimit(request: Request, env: Env, scope: string) {
  const address = request.headers.get("cf-connecting-ip");
  if (!address || !env.EXPENSIVE_API_RATE_LIMITER) return null;
  const result = await env.EXPENSIVE_API_RATE_LIMITER.limit({ key: `${scope}:${address}` });
  if (result.success) return null;
  return failure("RATE_LIMITED", "Demasiadas solicitudes. Intente nuevamente en un minuto.", 429, undefined);
}

function dbUnavailable() {
  return failure("DATABASE_UNAVAILABLE", "D1 no esta disponible.", 503, undefined);
}

function recordsScopeRequired(requestUrl: URL) {
  return failure(
    "RECORD_SCOPE_REQUIRED",
    "Indique una fuente, tipo, entidad, texto o rango de fechas para consultar registros paginados.",
    400,
    {
      requiredAnyOf: ["source", "kind", "q", "query", "entity_id", "from", "to"],
      reason: "unbounded-record-scan-disabled",
    },
  );
}

function hasRecordScope(requestUrl: URL) {
  return ["source", "kind", "q", "query", "entity_id", "from", "to"]
    .some((key) => Boolean(requestUrl.searchParams.get(key)?.trim()));
}

async function databaseSafe(query: Promise<Response>) {
  try {
    return await query;
  } catch {
    // Ningún error de un binding debe propagarse como 1101 al navegador. El
    // cliente recibe una respuesta uniforme y puede mostrar su estado de
    // reintento mientras la fuente alternativa o el siguiente reset están
    // disponibles.
    return dbUnavailable();
  }
}

export function cacheControlForStorage(value: string | null) {
  const directives = String(value ?? "")
    .split(",")
    .map((directive) => directive.trim())
    .filter(Boolean)
    .filter((directive) => !/^stale-(?:while-revalidate|if-error)\b/i.test(directive));
  return directives.length > 0 ? directives.join(", ") : "public, max-age=30, s-maxage=300";
}

async function cachedPublicGet(request: Request, producer: () => Promise<Response>) {
  // Las consultas públicas son inmutables por URL durante el ciclo de
  // publicación. Cachearlas en el edge evita repetir COUNT/SELECT costosos en
  // cada visita y protege el cupo gratuito de rows_read de D1. Si Cache API no
  // está disponible en un test o entorno local, se conserva el comportamiento
  // normal sin alterar el contrato.
  let cache: Cache;
  const marked = (response: Response, status: string) => {
    const copy = new Response(response.body, response);
    copy.headers.set("X-Cambiometro-Cache", status);
    return copy;
  };
  try {
    cache = (caches as CacheStorage & { default: Cache }).default;
  } catch {
    return marked(await producer(), "BYPASS");
  }
  try {
    const cached = await cache.match(request);
    if (cached) return marked(cached, "HIT");
  } catch {
    return marked(await producer(), "BYPASS");
  }
  const response = await producer();
  if (response.ok) {
    try {
      const stored = response.clone();
      // Cache API does not support stale-while-revalidate/stale-if-error.
      // Preserve the endpoint's supported public TTL so expensive D1-backed
      // responses are not forced to expire after five minutes.
      stored.headers.set("Cache-Control", cacheControlForStorage(stored.headers.get("Cache-Control")));
      await cache.put(request, stored);
    } catch {
      return marked(response, "BYPASS");
    }
  }
  return marked(response, "MISS");
}

interface TransferApiPage {
  page: number;
  count: number;
  key: string;
}

interface TransferApiManifest {
  schemaVersion: number;
  dataset: string;
  generatedAt: string;
  totalRows: number;
  pageSize: number;
  totalPages: number;
  pages: TransferApiPage[];
  searchIndex: { key: string; count: number };
  checksumSha256: string;
  expected?: { totalMontoClp?: number; totalReceptores?: number; totalEmisores?: number };
}

interface TransferSearchEntry {
  i: number;
  p: number;
  y: string | null;
  d: string | null;
  e: string | null;
  er?: string | null;
  r: string | null;
  rr?: string | null;
  t: string | null;
  m: number;
}

function isCompleteTransferManifest(value: TransferApiManifest | null): value is TransferApiManifest {
  if (!value || value.schemaVersion !== 1 || !value.dataset || !value.checksumSha256) return false;
  if (!Number.isInteger(value.totalRows) || value.totalRows < 1) return false;
  if (!Number.isInteger(value.pageSize) || value.pageSize < 1) return false;
  if (!Number.isInteger(value.totalPages) || value.totalPages < 1 || !Array.isArray(value.pages) || value.pages.length !== value.totalPages) return false;
  if (!value.pages.every((page, index) => page.page === index + 1 && page.count >= 0 && Boolean(page.key))) return false;
  return Boolean(value.searchIndex?.key && Number.isInteger(value.searchIndex.count) && value.searchIndex.count === value.totalRows);
}

interface CpltManifest {
  generatedAt: string;
  version: string;
  assets: Array<{ key: string }>;
  coverage?: Array<{ communeId: string; administrationId: string; status: string }>;
  searchIndex?: { key: string };
}

interface StaticSiteManifest {
  files: Array<{ path: string; key: string }>;
}

interface ExpenseSubset {
  schemaVersion: number;
  sourceId: "gastos_camara" | "gastos_senado";
  generatedAt?: string;
  recordCount: number;
  checksumSha256?: string;
  records: Array<{
    id: string;
    diputado_id?: string;
    nombre?: string;
    fecha: string;
    periodo: string;
    item: string;
    monto_clp: number;
    url: string;
    fuente: string;
  }>;
}

interface OfficialsSearchIndex {
  schemaVersion: number;
  totalRows: number;
  pageSize: number;
  pages: Array<{ page: number; key: string; count: number }>;
  shards: Record<string, string | string[]>;
  filters?: Record<string, { key: string; count: number }>;
}

interface CompactOfficialRow {
  id: string;
  n?: string;
  c?: string;
  o?: string;
  ot?: string;
  t?: string;
  e?: string;
  b?: number;
  l?: number;
  h?: number;
  x?: number;
  g?: string;
  fi?: string;
  p?: string;
  u?: string;
  oid?: string;
}

type CompactOfficialTokenEntry = [token: string, positions: number[]];

async function r2Json<T>(bucket: R2Bucket | undefined, key: string): Promise<T | null> {
  if (!bucket) return null;
  let object;
  try {
    object = await bucket.get(key);
  } catch {
    // R2 debe comportarse como una fuente degradable: un fallo temporal del
    // binding no puede convertirse en un 1101 de Cloudflare para el cliente.
    return null;
  }
  if (!object) return null;
  try {
    return await object.json<T>();
  } catch {
    return null;
  }
}

async function transferManifest(env: Env) {
  const manifest = await r2Json<TransferApiManifest>(env.PUBLIC_DATA, "projections/transferencias-v1/manifest.json");
  return isCompleteTransferManifest(manifest) ? manifest : null;
}

async function health(env: Env) {
  const manifest = await transferManifest(env);
  const d1 = Boolean(env.DB);
  const transferDb = env.TRANSFERS_DB ?? env.DB;
  const transferD1 = Boolean(transferDb);
  const r2 = Boolean(manifest);
  const checkD1 = env.HEALTH_CHECK_D1 === "1";
  let d1TransferRows = 0;
  let d1ReleaseChecksum: string | null = null;
  if (transferD1 && checkD1) {
    try {
      // Never count the transfer table from a health probe. COUNT(*) scans the
      // full D1 projection and can consume the free rows_read quota every time
      // uptime smoke calls this endpoint. The release pointer is the cheap,
      // canonical consistency check; a physical-table audit is a separate
      // operator action, not a public health request.
      const release = await transferDb?.prepare("SELECT checksum_sha256,total_rows FROM transferencias_19862_release WHERE singleton = 1").first<{ checksum_sha256: string; total_rows: number }>();
      d1TransferRows = Number(release?.total_rows ?? 0);
      d1ReleaseChecksum = release?.checksum_sha256 ?? null;
    } catch {
      d1TransferRows = 0;
      d1ReleaseChecksum = null;
    }
  }
  // The dedicated transfer projection is preferred when available. R2 remains
  // the canonical fallback so a partial refresh never takes the public API
  // offline.
  const d1Consistent = Boolean(checkD1 && transferD1 && manifest && d1TransferRows === manifest.totalRows && d1ReleaseChecksum === manifest.checksumSha256);
  const ok = Boolean(r2);
  return json({
    data: {
    ok,
    service: "cambiometro-public-api",
    d1,
    r2,
    d1TransferRows,
    d1Consistent,
    transferD1,
    d1ReleaseChecksum,
    transferSource: d1Consistent && env.PREFER_TRANSFER_D1 === "1" ? "d1" : "r2",
    transferRows: manifest?.totalRows ?? 0,
    generatedAt: manifest?.generatedAt ?? null,
    },
    meta: {},
    links: {},
  }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}

function transferApiRow(row: JsonRecord) {
  return {
    id: row.id,
    fecha: row.fecha ?? null,
    period: row.period ?? row.periodo ?? null,
    title: row.title ?? row.materia ?? null,
    description: row.description ?? null,
    classification: row.classification ?? row.clasificacion ?? null,
    emitter_name: row.emitter_name ?? row.emisor_nombre ?? null,
    emitter_rut: row.emitter_rut ?? row.emisor_rut ?? null,
    receiver_name: row.receiver_name ?? row.receptor_nombre ?? null,
    receiver_rut: row.receiver_rut ?? row.receptor_rut ?? null,
    monto_clp: Number(row.monto_clp ?? 0),
    url: row.url ?? row.url_registro ?? null,
    municipality: row.municipality ?? row.comuna ?? null,
  };
}

async function listTransferenciasFromR2(requestUrl: URL, env: Env) {
  const manifest = await r2Json<TransferApiManifest>(env.PUBLIC_DATA, "projections/transferencias-v1/manifest.json");
  if (!isCompleteTransferManifest(manifest)) {
    return failure("DATASET_UNAVAILABLE", "El release completo de transferencias no está publicado.", 503);
  }
  const rawPage = Number(requestUrl.searchParams.get("page") ?? 1);
  const rawLimit = Number(requestUrl.searchParams.get("limit") ?? 10);
  const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(rawLimit, 100)) : 10;
  const requestedPage = Number.isInteger(rawPage) ? Math.max(1, rawPage) : 1;
  const search = (requestUrl.searchParams.get("q") ?? requestUrl.searchParams.get("search") ?? "").trim().toLocaleLowerCase();
  const year = (requestUrl.searchParams.get("year") ?? "").trim();
  const emisor = (requestUrl.searchParams.get("emisor") ?? "").trim().toLocaleLowerCase();
  const sort = requestUrl.searchParams.get("sort") === "fecha" ? "fecha" : "monto";

  if (!search && (!year || year === "Todos") && (!emisor || emisor === "Todos") && sort === "monto") {
    const totalPages = Math.max(1, Math.ceil(manifest.totalRows / limit));
    const page = Math.min(requestedPage, totalPages);
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, manifest.totalRows);
    const firstPhysicalPage = Math.floor(startIndex / manifest.pageSize) + 1;
    const lastPhysicalPage = Math.floor((endIndex - 1) / manifest.pageSize) + 1;
    const physicalPages = await Promise.all(
      manifest.pages.slice(firstPhysicalPage - 1, lastPhysicalPage).map(async (pageInfo) => {
        const rows = await r2Json<JsonRecord[]>(env.PUBLIC_DATA, pageInfo.key);
        if (!rows) throw new Error(`R2_TRANSFER_PAGE_MISSING:${pageInfo.page}`);
        return rows;
      }),
    ).catch(() => null);
    if (!physicalPages) return failure("DATASET_UNAVAILABLE", "El chunk de transferencias no está disponible.", 503);
    const offsetInPhysicalRows = startIndex - (firstPhysicalPage - 1) * manifest.pageSize;
    const data = physicalPages.flat().slice(offsetInPhysicalRows, offsetInPhysicalRows + limit).map(transferApiRow);
    return json({
      data,
      total: manifest.totalRows,
      page,
      limit,
      totalPages,
      kpis: {
        total_monto_clp: manifest.expected?.totalMontoClp ?? 0,
        total_transfers: manifest.totalRows,
        total_receptores: manifest.expected?.totalReceptores ?? 0,
        total_emisores: manifest.expected?.totalEmisores ?? 0,
      },
      by_year: {},
      sourceStatus: "complete",
      checksumSha256: manifest.checksumSha256,
    }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=3600, stale-while-revalidate=86400" } });
  }

  const index = await r2Json<TransferSearchEntry[]>(env.PUBLIC_DATA, manifest.searchIndex.key);
  if (!index) return failure("DATASET_UNAVAILABLE", "El índice de transferencias no está disponible.", 503);
  const selected = index.filter((entry) => {
    const haystack = [entry.e, entry.er, entry.r, entry.rr, entry.t, entry.y].filter(Boolean).join(" ").toLocaleLowerCase();
    return (!search || haystack.includes(search))
      && (!year || year === "Todos" || entry.y === year)
      && (!emisor || emisor === "Todos" || String(entry.e ?? "").toLocaleLowerCase() === emisor);
  });
  selected.sort((left, right) => sort === "fecha"
    ? String(right.d ?? "").localeCompare(String(left.d ?? "")) || right.m - left.m
    : right.m - left.m || String(right.d ?? "").localeCompare(String(left.d ?? "")));
  const total = selected.length;
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / limit)));
  const selectedPage = selected.slice((page - 1) * limit, page * limit);
  const pageNumbers = [...new Set(selectedPage.map((entry) => entry.p))];
  const chunks = await Promise.all(pageNumbers.map(async (pageNumber) => {
    const pageInfo = manifest.pages[pageNumber - 1];
    const rows = await r2Json<JsonRecord[]>(env.PUBLIC_DATA, pageInfo.key);
    if (!rows) throw new Error(`R2_TRANSFER_PAGE_MISSING:${pageNumber}`);
    return [pageNumber, rows] as const;
  }));
  const rowsByIndex = new Map<number, JsonRecord>();
  for (const [pageNumber, rows] of chunks) rows.forEach((row, rowIndex) => rowsByIndex.set((pageNumber - 1) * manifest.pageSize + rowIndex, row));
  return json({
    data: selectedPage.map((entry) => rowsByIndex.get(entry.i)).filter((row): row is JsonRecord => Boolean(row)).map(transferApiRow),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    kpis: {
      total_monto_clp: manifest.expected?.totalMontoClp ?? 0,
      total_transfers: manifest.totalRows,
      total_receptores: manifest.expected?.totalReceptores ?? 0,
      total_emisores: manifest.expected?.totalEmisores ?? 0,
    },
    by_year: {},
    sourceStatus: "complete",
    checksumSha256: manifest.checksumSha256,
  }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=3600, stale-while-revalidate=86400" } });
}

function normalized(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-CL").trim();
}

function politicoSlug(value: unknown) {
  return normalized(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function compactNormalized(value: unknown) {
  return normalized(value).replace(/[^a-z0-9]/g, "");
}

function canonicalContract(value: unknown) {
  return compactNormalized(value).replace("codigodeltrabajo", "codigotrabajo");
}

function canonicalOrgType(value: unknown) {
  return compactNormalized(value).replace("gobiernoregional", "gore");
}

function officialSalary(row: JsonRecord) {
  const value = Number(row.remuneracion_bruta_mensual ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function officialsResponse(rows: JsonRecord[], requestUrl: URL, generatedAt: string, sourceStatus: string, coverage: string) {
  const query = normalized(requestUrl.searchParams.get("query"));
  const contract = requestUrl.searchParams.get("contrato") ?? "Todos";
  const estamento = normalized(requestUrl.searchParams.get("estamento") ?? "Todos");
  const sortBy = requestUrl.searchParams.get("sortBy") ?? "sueldo_desc";
  const includeZero = requestUrl.searchParams.get("include_zero") === "true";
  const onlyAnomalies = requestUrl.searchParams.get("anomalias") === "true";
  const soloHorasExtras = requestUrl.searchParams.get("horas_extras") === "true" || requestUrl.searchParams.get("soloHorasExtras") === "true";
  const minSalary = requestUrl.searchParams.get("min_sueldo") ? Number(requestUrl.searchParams.get("min_sueldo")) : undefined;
  const maxSalary = requestUrl.searchParams.get("max_sueldo") ? Number(requestUrl.searchParams.get("max_sueldo")) : undefined;
  const period = requestUrl.searchParams.get("periodo") ?? requestUrl.searchParams.get("fuente_periodo") ?? "Todos";
  const type = normalized(requestUrl.searchParams.get("tipo") ?? "Todos");
  const position = normalized(requestUrl.searchParams.get("cargo") ?? "Todos");
  const allRecords = period !== "Todos" ? rows.filter((row) => String(row.fuente_periodo ?? row.periodo ?? "") === period) : rows;
  const withoutPayment = allRecords.filter((row) => officialSalary(row) <= 0);
  const microAmount = allRecords.filter((row) => officialSalary(row) > 0 && officialSalary(row) < 50_000);
  const completeSalary = allRecords.filter((row) => officialSalary(row) >= 50_000);
  let filtered = includeZero ? [...allRecords] : onlyAnomalies ? [...microAmount] : allRecords.filter((row) => officialSalary(row) > 0);
  if (query) filtered = filtered.filter((row) => normalized(`${row.nombre_completo ?? ""} ${row.cargo ?? ""} ${row.organo_nombre ?? ""} ${row.formacion ?? ""}`).includes(query));
  if (type && type !== "todos") filtered = filtered.filter((row) => canonicalOrgType(row.organo_tipo).includes(canonicalOrgType(type)));
  if (position && position !== "todos") {
    filtered = filtered.filter((row) => position === "alcalde"
      ? /^(alcalde|alcaldesa)(\s|$)/.test(normalized(row.cargo))
      : normalized(row.cargo).includes(position));
  }
  if (contract !== "Todos") {
    const contractKey = canonicalContract(contract);
    filtered = filtered.filter((row) => canonicalContract(row.tipo_contrato).includes(contractKey));
  }
  if (estamento && estamento !== "todos") filtered = filtered.filter((row) => normalized(row.estamento).includes(estamento));
  if (soloHorasExtras) filtered = filtered.filter((row) => Number(row.horas_extras_mes_anterior ?? 0) > 0);
  if (Number.isFinite(minSalary)) filtered = filtered.filter((row) => officialSalary(row) >= Number(minSalary));
  if (Number.isFinite(maxSalary)) filtered = filtered.filter((row) => officialSalary(row) <= Number(maxSalary));
  filtered.sort((left, right) => {
    if (sortBy === "sueldo_asc") return officialSalary(left) - officialSalary(right);
    if (sortBy === "horas_extras_desc") return Number(right.horas_extras_mes_anterior ?? 0) - Number(left.horas_extras_mes_anterior ?? 0);
    if (sortBy === "nombre_asc") return String(left.nombre_completo ?? "").localeCompare(String(right.nombre_completo ?? ""), "es-CL");
    if (sortBy === "nombre_desc") return String(right.nombre_completo ?? "").localeCompare(String(left.nombre_completo ?? ""), "es-CL");
    return officialSalary(right) - officialSalary(left);
  });
  const pageValue = Number(requestUrl.searchParams.get("page") ?? 1);
  const limitValue = Number(requestUrl.searchParams.get("limit") ?? 20);
  const page = Number.isInteger(pageValue) ? Math.max(1, Math.min(pageValue, 100_000)) : 1;
  const limit = Number.isInteger(limitValue) ? Math.max(1, Math.min(limitValue, 100)) : 20;
  const validSalary = completeSalary.reduce((sum, row) => sum + officialSalary(row), 0);
  const total = filtered.length;
  const data = filtered.slice((page - 1) * limit, page * limit);
  return json({
    data,
    meta: {
      total,
      totalHeadcount: allRecords.length,
      sinPagoCount: withoutPayment.length,
      microMontoCount: microAmount.length,
      sueldoCompletoCount: completeSalary.length,
      observadosCount: withoutPayment.length + microAmount.length,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      limit,
      updatedAt: generatedAt,
      communeId: coverage,
      sourceStatus,
      stats: {
        totalMuni: allRecords.length,
        totalValidos: completeSalary.length,
        promedioSueldo: completeSalary.length ? Math.round(validSalary / completeSalary.length) : 0,
        conHorasExtras: completeSalary.filter((row) => Number(row.horas_extras_mes_anterior ?? 0) > 0).length,
        observadosCount: withoutPayment.length + microAmount.length,
        sinPagoCount: withoutPayment.length,
        microMontoCount: microAmount.length,
      },
    },
    links: { self: requestUrl.toString() },
  }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=3600, stale-while-revalidate=86400" } });
}

function compactOfficialRow(row: CompactOfficialRow): JsonRecord {
  return {
    id: row.id,
    nombre_completo: row.n ?? "",
    cargo: row.c ?? "",
    organo_nombre: row.o ?? row.oid ?? "",
    organo_id: row.oid ?? "",
    organo_tipo: row.ot ?? "",
    tipo_contrato: row.t ?? "",
    estamento: row.e ?? "",
    remuneracion_bruta_mensual: Number(row.b ?? 0),
    remuneracion_liquida_mensual: row.l == null ? null : Number(row.l),
    horas_extras_mes_anterior: Number(row.h ?? 0),
    monto_horas_extras_clp: Number(row.x ?? 0),
    grado_eus: row.g ?? null,
    fecha_ingreso: row.fi ?? null,
    fuente_periodo: row.p ?? null,
    periodo: row.p ?? null,
    url: row.u ?? null,
  };
}

function compactOfficialRows(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => compactOfficialRow(row as CompactOfficialRow));
}

function officialFilterKeys(requestUrl: URL) {
  const keys: string[] = [];
  const values = [
    ["contrato", requestUrl.searchParams.get("contrato") ?? "Todos"],
    ["estamento", requestUrl.searchParams.get("estamento") ?? "Todos"],
    ["tipo", requestUrl.searchParams.get("tipo") ?? "Todos"],
    ["cargo", requestUrl.searchParams.get("cargo") ?? "Todos"],
  ];
  for (const [name, value] of values) {
    const normalizedValue = normalized(value);
    if (normalizedValue && normalizedValue !== "todos") keys.push(`${name}:${normalizedValue}`);
  }
  if (requestUrl.searchParams.get("horas_extras") === "true" || requestUrl.searchParams.get("soloHorasExtras") === "true") {
    keys.push("horas_extras:true");
  }
  return keys;
}

function intersectSortedPositions(lists: number[][]) {
  if (lists.length === 0) return [];
  return [...lists].sort((left, right) => left.length - right.length).reduce((left, right) => {
    const intersection: number[] = [];
    let leftIndex = 0;
    let rightIndex = 0;
    while (leftIndex < left.length && rightIndex < right.length) {
      if (left[leftIndex] === right[rightIndex]) {
        intersection.push(left[leftIndex]);
        leftIndex += 1;
        rightIndex += 1;
      } else if (left[leftIndex] < right[rightIndex]) {
        leftIndex += 1;
      } else {
        rightIndex += 1;
      }
    }
    return intersection;
  });
}

async function officialsAtPositions(index: OfficialsSearchIndex, positions: number[], env: Env) {
  if (positions.length === 0) return [];
  const physicalPages = [...new Set(positions.map((position) => Math.floor(position / index.pageSize) + 1))];
  const loaded = await Promise.all(physicalPages.map(async (pageNumber) => {
    const page = index.pages.find((item) => item.page === pageNumber);
    if (!page) return null;
    const rows = await r2Json<CompactOfficialRow[]>(env.PUBLIC_DATA, page.key);
    return rows ? [pageNumber, rows] as const : null;
  }));
  if (loaded.some((entry) => entry === null)) return null;
  const byPage = new Map(loaded.filter((entry): entry is readonly [number, CompactOfficialRow[]] => entry !== null));
  return compactOfficialRows(positions.map((position) => byPage.get(Math.floor(position / index.pageSize) + 1)?.[position % index.pageSize]).filter(Boolean));
}

async function listFuncionariosFromD1(requestUrl: URL, env: Env): Promise<Response | null> {
  if (!env.DB) return null;
  const limit = limitFrom(requestUrl);
  const pageRaw = Number(requestUrl.searchParams.get("page") ?? 1);
  const page = Number.isInteger(pageRaw) ? Math.max(1, Math.min(pageRaw, 100_000)) : 1;
  const offset = (page - 1) * limit;
  const query = normalized(requestUrl.searchParams.get("query") ?? requestUrl.searchParams.get("q"));
  const organism = requestUrl.searchParams.get("muni") ?? requestUrl.searchParams.get("organismo") ?? "Todos";
  const contract = requestUrl.searchParams.get("contrato") ?? "Todos";
  const estamento = requestUrl.searchParams.get("estamento") ?? "Todos";
  const type = requestUrl.searchParams.get("tipo") ?? "Todos";
  const position = normalized(requestUrl.searchParams.get("cargo") ?? "Todos");
  const clauses: string[] = [];
  const bindings: (string | number)[] = [];
  if (organism !== "Todos") { clauses.push("organo_id = ?"); bindings.push(organism); }
  if (query) { const pattern = `%${query.replace(/[%_]/g, "")}%`; clauses.push("(nombre_completo LIKE ? COLLATE NOCASE OR cargo LIKE ? COLLATE NOCASE OR organo_id LIKE ? COLLATE NOCASE)"); bindings.push(pattern, pattern, pattern); }
  if (contract !== "Todos") { clauses.push("tipo_contrato = ?"); bindings.push(contract); }
  if (estamento !== "Todos") { clauses.push("estamento LIKE ? COLLATE NOCASE"); bindings.push(`%${estamento.replace(/[%_]/g, "")}%`); }
  if (type !== "Todos") { clauses.push("organo_tipo LIKE ? COLLATE NOCASE"); bindings.push(`%${type.replace(/[%_]/g, "")}%`); }
  if (position && position !== "todos") {
    if (position === "alcalde") clauses.push("(LOWER(cargo) = 'alcalde' OR LOWER(cargo) = 'alcaldesa' OR LOWER(cargo) LIKE 'alcalde %' OR LOWER(cargo) LIKE 'alcaldesa %')");
    else { clauses.push("cargo LIKE ? COLLATE NOCASE"); bindings.push(`%${position.replace(/[%_]/g, "")}%`); }
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const order = requestUrl.searchParams.get("sortBy") === "nombre_asc" ? "nombre_completo ASC, id ASC" : requestUrl.searchParams.get("sortBy") === "nombre_desc" ? "nombre_completo DESC, id DESC" : "remuneracion_bruta_mensual DESC, id ASC";
  try {
    const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS total FROM funcionarios_publicos ${where}`).bind(...bindings).first<{ total: number }>();
    const rows = await env.DB.prepare(`SELECT id, nombre_completo, cargo, organo_id, organo_tipo, estamento, tipo_contrato, remuneracion_bruta_mensual, fecha_ingreso FROM funcionarios_publicos ${where} ORDER BY ${order} LIMIT ? OFFSET ?`).bind(...bindings, limit, offset).all<JsonRecord>();
    const total = Number(totalRow?.total ?? 0);
    // Una tabla histórica puede existir en D1 pero estar vacía mientras el
    // release completo vive en R2. En ese caso dejamos que continúe el
    // fallback de R2 en lugar de presentar un directorio falsamente vacío.
    if (total === 0) return null;
    const data = (rows.results ?? []).map((row) => ({
      ...row,
      organo_nombre: row.organo_id,
      remuneracion_liquida_mensual: null,
      horas_extras_mes_anterior: 0,
      monto_horas_extras_clp: 0,
      fuente: "Transparencia Activa CPLT",
    }));
    return json({ data, meta: { total, totalHeadcount: total, page, totalPages: Math.max(1, Math.ceil(total / limit)), limit, updatedAt: null, sourceStatus: "d1", stats: { totalMuni: total, totalValidos: data.filter((row) => officialSalary(row) >= 50_000).length, promedioSueldo: 0, conHorasExtras: 0, observadosCount: 0, sinPagoCount: 0, microMontoCount: 0 } }, links: { self: requestUrl.toString() } });
  } catch {
    // Cualquier fallo del binding D1 (incluido el 1101 que Cloudflare emite
    // al agotar rows_read) debe activar la fuente canónica paginada en R2.
    // El mensaje del binding no es estable entre ejecuciones, por lo que no
    // se puede depender de reconocer una cadena concreta.
    return null;
  }
}

async function listFuncionariosFromR2(requestUrl: URL, env: Env) {
  const organism = requestUrl.searchParams.get("muni") ?? requestUrl.searchParams.get("organismo") ?? "Todos";
  const manifest = await r2Json<CpltManifest>(env.PUBLIC_DATA, "projections/funcionarios-v1/manifest.json");
  if (!manifest?.version || !Array.isArray(manifest.assets)) return failure("DATASET_UNAVAILABLE", "La nómina oficial no está publicada.", 503);

  if (!organism || organism === "Todos") {
    const indexKey = manifest.searchIndex?.key ?? `projections/funcionarios-v1/versions/${manifest.version}/search_index.json`;
    const index = await r2Json<OfficialsSearchIndex | CompactOfficialRow[]>(env.PUBLIC_DATA, indexKey);
    if (Array.isArray(index)) {
      return officialsResponse(compactOfficialRows(index), requestUrl, manifest.generatedAt, "r2-search-legacy", "Todos");
    }
    if (!index?.pages?.length || !Number.isInteger(index.totalRows)) return failure("DATASET_UNAVAILABLE", "La búsqueda nacional no está publicada temporalmente.", 503);
    const query = normalized(requestUrl.searchParams.get("query") ?? requestUrl.searchParams.get("q"));
    const requestedPage = Number(requestUrl.searchParams.get("page") ?? 1);
    const requestedLimit = Number(requestUrl.searchParams.get("limit") ?? 20);
    const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 100)) : 20;
    const filterKeys = officialFilterKeys(requestUrl);
    let resultTotal = index.totalRows;
    let totalPages = Math.max(1, Math.ceil(resultTotal / limit));
    let page = Number.isInteger(requestedPage) ? Math.max(1, Math.min(requestedPage, totalPages)) : 1;
    let rows: JsonRecord[] = [];
    if (query) {
      const queryTokens = [...new Set(query.split(/\s+/).map((value) => value.replace(/[^a-z0-9]/gi, "")).filter((value) => value.length >= 2))];
      const tokenPositionLists = await Promise.all(queryTokens.map(async (token) => {
        const prefix = token.slice(0, 2);
        const shardValue = index.shards?.[prefix];
        const shardKeys = Array.isArray(shardValue) ? shardValue : shardValue ? [shardValue] : [];
        const shardParts = await Promise.all(shardKeys.map((key) => r2Json<CompactOfficialTokenEntry[]>(env.PUBLIC_DATA, key)));
        if (shardParts.some((entries) => !Array.isArray(entries))) return null;
        return [...new Set(shardParts
          .flatMap((entries) => entries ?? [])
          .filter((entry) => Array.isArray(entry) && typeof entry[0] === "string" && entry[0].startsWith(token) && Array.isArray(entry[1]))
          .flatMap((entry) => entry[1])
          .filter(Number.isInteger))].sort((left, right) => left - right);
      }));
      if (queryTokens.length === 0 || tokenPositionLists.some((positions) => positions === null)) {
        return failure("DATASET_UNAVAILABLE", "Un índice nacional de búsqueda no está disponible.", 503);
      }
      let positions = intersectSortedPositions(tokenPositionLists as number[][]);
      if (filterKeys.length > 0) {
        const filterDescriptors = filterKeys.map((key) => index.filters?.[key]);
        if (filterDescriptors.some((descriptor) => !descriptor)) {
          return failure("DATASET_UNAVAILABLE", "Los índices nacionales de filtros aún no están publicados.", 503, { filters: filterKeys });
        }
        const filterPositions = await Promise.all(filterDescriptors.map((descriptor) => r2Json<number[]>(env.PUBLIC_DATA, descriptor!.key)));
        if (filterPositions.some((values) => !Array.isArray(values))) {
          return failure("DATASET_UNAVAILABLE", "Un índice nacional de filtros no está disponible.", 503, { filters: filterKeys });
        }
        positions = intersectSortedPositions([positions, ...(filterPositions as number[][])]);
      }
      resultTotal = positions.length;
      totalPages = Math.max(1, Math.ceil(resultTotal / limit));
      page = Number.isInteger(requestedPage) ? Math.max(1, Math.min(requestedPage, totalPages)) : 1;
      const selectedRows = await officialsAtPositions(index, positions.slice((page - 1) * limit, page * limit), env);
      if (selectedRows === null) return failure("DATASET_UNAVAILABLE", "Una página del directorio nacional no está disponible.", 503);
      rows = selectedRows;
    } else if (filterKeys.length > 0) {
      const filterDescriptors = filterKeys.map((key) => index.filters?.[key]);
      if (filterDescriptors.some((descriptor) => !descriptor)) {
        return failure("DATASET_UNAVAILABLE", "Los índices nacionales de filtros aún no están publicados.", 503, { filters: filterKeys });
      }
      const positionLists = await Promise.all(filterDescriptors.map((descriptor) => r2Json<number[]>(env.PUBLIC_DATA, descriptor!.key)));
      if (positionLists.some((positions) => !Array.isArray(positions))) {
        return failure("DATASET_UNAVAILABLE", "Un índice nacional de filtros no está disponible.", 503, { filters: filterKeys });
      }
      const positions = intersectSortedPositions(positionLists as number[][]);
      resultTotal = positions.length;
      totalPages = Math.max(1, Math.ceil(resultTotal / limit));
      page = Number.isInteger(requestedPage) ? Math.max(1, Math.min(requestedPage, totalPages)) : 1;
      const selected = positions.slice((page - 1) * limit, page * limit);
      const selectedRows = await officialsAtPositions(index, selected, env);
      if (selectedRows === null) return failure("DATASET_UNAVAILABLE", "Una página del directorio nacional no está disponible.", 503);
      rows = selectedRows;
    } else {
      // Las páginas físicas de R2 contienen hasta 10.000 filas, mientras que
      // la API expone páginas pequeñas. Traducimos el offset público al rango
      // físico correspondiente para no saltar miles de registros entre una
      // página y la siguiente.
      const start = (page - 1) * limit;
      const end = Math.min(start + limit, index.totalRows);
      const firstPhysicalPage = Math.floor(start / index.pageSize) + 1;
      const lastPhysicalPage = Math.floor(Math.max(start, end - 1) / index.pageSize) + 1;
      const physicalPages = index.pages.filter((item) => item.page >= firstPhysicalPage && item.page <= lastPhysicalPage);
      const physicalRows = await Promise.all(physicalPages.map((item) => r2Json<CompactOfficialRow[]>(env.PUBLIC_DATA, item.key)));
      const baseOffset = (firstPhysicalPage - 1) * index.pageSize;
      rows = compactOfficialRows(physicalRows.flatMap((value) => value ?? [])).slice(start - baseOffset, end - baseOffset);
    }
    const responseUrl = new URL(requestUrl);
    responseUrl.searchParams.set("page", "1");
    if (query) {
      responseUrl.searchParams.delete("query");
      responseUrl.searchParams.delete("q");
    } else {
      responseUrl.searchParams.set("sortBy", "nombre_asc");
    }
    const response = officialsResponse(rows, responseUrl, manifest.generatedAt, "r2-search", "Todos");
    if (!query) {
      const payload = await response.json() as JsonRecord;
      const meta = (payload.meta as JsonRecord) ?? {};
      meta.total = resultTotal;
      meta.totalHeadcount = index.totalRows;
      meta.page = page;
      meta.totalPages = totalPages;
      meta.limit = limit;
      payload.meta = meta;
      return json(payload, { headers: { "Cache-Control": "public, max-age=30, s-maxage=3600, stale-while-revalidate=86400" } });
    }
    const payload = await response.json() as JsonRecord;
    const meta = (payload.meta as JsonRecord) ?? {};
    meta.total = resultTotal;
    meta.totalHeadcount = index.totalRows;
    meta.page = page;
    meta.totalPages = totalPages;
    meta.limit = limit;
    payload.meta = meta;
    return json(payload, { headers: { "Cache-Control": "public, max-age=30, s-maxage=3600, stale-while-revalidate=86400" } });
  }
  const key = manifest.assets.find((asset) => asset.key === `projections/funcionarios-v1/versions/${manifest.version}/${organism}.json`)?.key;
  if (!key) return failure("DATASET_UNAVAILABLE", "No existe una nómina publicada para este organismo.", 404, { organism });
  const rows = await r2Json<JsonRecord[]>(env.PUBLIC_DATA, key);
  if (!rows) return failure("DATASET_UNAVAILABLE", "La nómina oficial no está disponible temporalmente.", 503);
  return officialsResponse(rows, requestUrl, manifest.generatedAt, "r2", organism);
}

function limitFrom(url: URL) {
  const raw = Number(url.searchParams.get("limit") ?? 25);
  return Number.isInteger(raw) ? Math.min(Math.max(raw, 1), 100) : 25;
}

function offsetFrom(url: URL) {
  const cursor = url.searchParams.get("cursor");
  if (cursor) {
    const match = /^v1_([0-9a-z]+)$/.exec(cursor);
    return match ? Number.parseInt(match[1], 36) : 0;
  }
  const explicitOffset = Number(url.searchParams.get("offset"));
  if (Number.isInteger(explicitOffset) && explicitOffset > 0) return explicitOffset;
  const page = Number(url.searchParams.get("page"));
  if (Number.isInteger(page) && page > 1) return (page - 1) * limitFrom(url);
  return 0;
}

function pageLinks(url: URL, offset: number, limit: number, total: number) {
  const links: JsonRecord = { self: url.toString() };
  if (offset + limit < total) {
    const next = new URL(url);
    next.searchParams.set("cursor", `v1_${offset + limit}`);
    links.next = next.toString();
  }
  return links;
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string" || value.length === 0) return value;
  try { return JSON.parse(value); } catch { return value; }
}

function entity(row: JsonRecord) {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    identifiers: parseJson(row.identifiers_json) ?? [],
    attributes: parseJson(row.attributes_json) ?? {},
    sourceIds: parseJson(row.source_ids_json) ?? [],
    updatedAt: row.updated_at ?? null,
  };
}

async function canonicalEntitiesFromR2(env: Env) {
  const manifest = await r2Json<StaticSiteManifest>(env.PUBLIC_DATA, "projections/static-site-v1/manifest.json");
  const entry = manifest?.files?.find((file) => file.path === "data/catalog/entities-routes.json");
  const keys = [entry?.key, "projections/entities-v1/entities-routes.json"].filter((key): key is string => Boolean(key));
  for (const key of keys) {
    const rows = await r2Json<JsonRecord[]>(env.PUBLIC_DATA, key);
    if (Array.isArray(rows)) return rows;
  }
  return null;
}

async function listEntitiesFromR2(requestUrl: URL, env: Env) {
  const rows = await canonicalEntitiesFromR2(env);
  if (!rows) return null;
  const limit = limitFrom(requestUrl);
  const offset = offsetFrom(requestUrl);
  const kind = requestUrl.searchParams.get("kind");
  const query = requestUrl.searchParams.get("q")?.trim().slice(0, 80) ?? "";
  const normalizeEntitySearch = (value: unknown) => String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-CL");
  const normalizedQuery = normalizeEntitySearch(query);
  const filtered = rows
    .filter((row) => !kind || row.kind === kind)
    .filter((row) => !normalizedQuery || normalizeEntitySearch(row.name).includes(normalizedQuery))
    .sort((left, right) => String(left.name ?? "").localeCompare(String(right.name ?? ""), "es-CL") || String(left.id ?? "").localeCompare(String(right.id ?? "")));
  const total = filtered.length;
  return success(filtered.slice(offset, offset + limit).map(entity), { total, limit }, pageLinks(requestUrl, offset, limit, total));
}

function politico(row: JsonRecord) {
  return {
    id: row.id,
    kind: "politico",
    name: row.nombre_completo,
    nombre_completo: row.nombre_completo,
    cargo: row.cargo ?? null,
    partido: row.partido_id ? { id: row.partido_id, sigla: String(row.partido_id).toUpperCase() } : null,
    distrito_region: row.distrito_region ?? null,
    evidencia: [],
    url_ficha: `/politico/${row.id}`,
    identifiers: [],
    attributes: {
      cargo: row.cargo ?? null,
      partidoId: row.partido_id ?? null,
      distritoRegion: row.distrito_region ?? null,
      twitterHandle: row.twitter_handle ?? null,
    },
    sourceIds: [],
    updatedAt: null,
  };
}

function record(row: JsonRecord) {
  return {
    id: row.id,
    kind: row.kind,
    sourceId: row.source_id,
    title: row.title,
    description: row.description,
    occurredAt: row.occurred_at,
    period: parseJson(row.period_json) ?? {},
    subjectEntityIds: parseJson(row.subject_entity_ids_json) ?? [],
    objectEntityIds: parseJson(row.object_entity_ids_json) ?? [],
    amount: parseJson(row.amount_json),
    evidence: parseJson(row.evidence_json) ?? {},
    data: parseJson(row.data_json) ?? {},
  };
}

function expenseRecord(row: ExpenseSubset["records"][number], sourceId: ExpenseSubset["sourceId"]): JsonRecord {
  const subjectEntityIds = sourceId === "gastos_camara" && row.diputado_id
    ? [`person-camara-${row.diputado_id}`]
    : [];
  return {
    id: row.id,
    kind: "expense",
    sourceId,
    title: row.item,
    description: row.nombre ?? null,
    occurredAt: row.fecha,
    period: { periodo: row.periodo },
    subjectEntityIds,
    objectEntityIds: [],
    amount: { amountClp: row.monto_clp, currency: "CLP" },
    evidence: { url: row.url, fuente: row.fuente },
    data: row,
  };
}

async function listExpensesFromR2(requestUrl: URL, env: Env): Promise<Response | null> {
  const requestedSource = requestUrl.searchParams.get("source")?.trim();
  const requestedKind = requestUrl.searchParams.get("kind")?.trim();
  const expenseSources: ExpenseSubset["sourceId"][] = ["gastos_camara", "gastos_senado"];
  if (requestedSource && !expenseSources.includes(requestedSource as ExpenseSubset["sourceId"])) return null;
  if (requestedKind && requestedKind !== "expense") return null;

  const manifest = await r2Json<StaticSiteManifest>(env.PUBLIC_DATA, "projections/static-site-v1/manifest.json");
  if (!manifest?.files?.length) return null;
  const sourceIds = requestedSource ? [requestedSource as ExpenseSubset["sourceId"]] : expenseSources;
  const subsets = await Promise.all(sourceIds.map(async (sourceId) => {
    const path = `data/lake-subsets/${sourceId.replace("gastos_", "gastos-")}.subset.json`;
    const entry = manifest.files.find((file) => file.path === path);
    if (!entry) return null;
    return await r2Json<ExpenseSubset>(env.PUBLIC_DATA, entry.key);
  }));
  if (subsets.some((subset) => !subset || !Array.isArray(subset.records))) return null;

  const query = normalized(requestUrl.searchParams.get("q") ?? requestUrl.searchParams.get("query"));
  const from = requestUrl.searchParams.get("from")?.trim() ?? "";
  const to = requestUrl.searchParams.get("to")?.trim() ?? "";
  const entityId = normalized(requestUrl.searchParams.get("entity_id"));
  if (query.length > 80 || from.length > 32 || to.length > 32 || entityId.length > 160) {
    return failure("INVALID_QUERY", "Parámetros de consulta inválidos.", 400);
  }
  const normalize = (value: unknown) => normalized(value);
  const rows = subsets.flatMap((subset) => subset!.records.map((row) => ({ row, sourceId: subset!.sourceId })));
  const filtered = rows
    .filter(({ row }) => !query || normalize(`${row.id} ${row.nombre} ${row.item} ${row.fuente}`).includes(query))
    .filter(({ row }) => !from || row.fecha >= from)
    .filter(({ row }) => !to || row.fecha <= to)
    .filter(({ row }) => !entityId || normalize(`${row.diputado_id ?? ""} ${row.nombre ?? ""}`).includes(entityId))
    .sort((left, right) => right.row.fecha.localeCompare(left.row.fecha) || right.row.id.localeCompare(left.row.id));

  const limit = limitFrom(requestUrl);
  const offset = offsetFrom(requestUrl);
  const total = filtered.length;
  const data = filtered.slice(offset, offset + limit).map(({ row, sourceId }) => expenseRecord(row, sourceId));
  return success(data, {
    total,
    limit,
    page: Math.floor(offset / limit) + 1,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    source: requestedSource ?? "gastos_operacionales",
    updatedAt: subsets.reduce((latest, subset) => String(subset!.generatedAt ?? "") > latest ? String(subset!.generatedAt ?? "") : latest, ""),
    sourceBackend: "r2",
  }, pageLinks(requestUrl, offset, limit, total));
}

function r2Record(row: JsonRecord, source: string): JsonRecord {
  if (typeof row.sourceId === "string" && typeof row.title === "string" && (row.data !== undefined || row.evidence !== undefined)) {
    return {
      id: row.id,
      kind: row.kind ?? null,
      sourceId: row.sourceId,
      title: row.title,
      description: row.description ?? null,
      occurredAt: row.occurredAt ?? row.fecha ?? null,
      period: row.period ?? {},
      subjectEntityIds: row.subjectEntityIds ?? [],
      objectEntityIds: row.objectEntityIds ?? [],
      amount: row.amount ?? null,
      evidence: row.evidence ?? {},
      data: row.data ?? {},
    };
  }
  if (source === "infoprobidad") {
    const organizations = Array.isArray(row.organizations) ? row.organizations : [];
    return {
      id: row.id,
      kind: "declaration",
      sourceId: source,
      title: row.title ?? `Declaración de intereses y patrimonio de ${row.nombre ?? "persona declarante"}`,
      description: null,
      occurredAt: row.fecha ?? null,
      period: { label: row.fecha ?? null },
      subjectEntityIds: organizations.map((item) => (item as JsonRecord)?.entity_id).filter((value): value is string => typeof value === "string"),
      objectEntityIds: [],
      amount: null,
      evidence: { sourceUrl: row.url ?? null },
      data: row,
    };
  }
  if (source === "infolobby") {
    return {
      id: row.id,
      kind: "lobby",
      sourceId: source,
      title: row.materia ?? row.title ?? row.id,
      description: row.materia ?? null,
      occurredAt: row.fecha ?? null,
      period: { label: row.fecha ?? null },
      subjectEntityIds: row.sujeto_pasivo_id ? [row.sujeto_pasivo_id] : [],
      objectEntityIds: row.organismo_id ? [row.organismo_id] : [],
      amount: null,
      evidence: { sourceUrl: row.url ?? null, fuente: row.fuente ?? null },
      data: row,
    };
  }
  return {
    id: row.id,
    kind: row.kind ?? "record",
    sourceId: source,
    title: row.title ?? row.id,
    description: row.description ?? null,
    occurredAt: row.occurredAt ?? row.fecha ?? null,
    period: row.period ?? {},
    subjectEntityIds: row.subjectEntityIds ?? [],
    objectEntityIds: row.objectEntityIds ?? [],
    amount: row.amount ?? null,
    evidence: row.evidence ?? { sourceUrl: row.url ?? null },
    data: row.data ?? row,
  };
}

async function listRecordsFromR2(requestUrl: URL, env: Env): Promise<Response | null> {
  const source = requestUrl.searchParams.get("source")?.trim();
  if (!source) return null;
  const manifest = await r2Json<StaticSiteManifest>(env.PUBLIC_DATA, "projections/static-site-v1/manifest.json");
  if (!manifest?.files?.length) return null;
  const candidatePaths = [
    `data/lake/projections/v1/${source}.json`,
    `data/lake-subsets/${source}.subset.json`,
  ];
  let rawRows: unknown[] = [];
  for (const path of candidatePaths) {
    const entry = manifest.files.find((file) => file.path === path);
    if (!entry) continue;
    const payload = await r2Json<JsonRecord>(env.PUBLIC_DATA, entry.key);
    const candidateRows = Array.isArray(payload) ? payload : Array.isArray(payload?.records) ? payload.records : [];
    if (candidateRows.length > 0) {
      rawRows = candidateRows;
      break;
    }
  }

  // The static-site projection is intentionally compact and is not the full
  // source record set. When D1 is unavailable, use the versioned lake
  // partition for sources whose complete records are published in R2. The
  // helper applies filters and pagination before returning the response, so
  // the dataset is never embedded in the Worker bundle or sent to the client
  // in one response.
  if ((source === "chilecompra" || source === "contraloria" || source === "infolobby") && env.PUBLIC_DATA) {
    try {
      const offset = offsetFrom(requestUrl);
      const limit = limitFrom(requestUrl);
      const lake = await readR2EvidenceRecords(env.PUBLIC_DATA, {
        source,
        query: requestUrl.searchParams.get("q")?.trim() ?? requestUrl.searchParams.get("query")?.trim() ?? undefined,
        entityId: requestUrl.searchParams.get("entity_id")?.trim() || undefined,
        kind: requestUrl.searchParams.get("kind")?.trim() as never || undefined,
        from: requestUrl.searchParams.get("from")?.trim() || undefined,
        to: requestUrl.searchParams.get("to")?.trim() || undefined,
        limit,
        cursor: offset > 0 ? `v1_${offset.toString(36)}` : undefined,
      });
      if (lake) {
        return success(lake.data, {
          total: lake.total,
          limit,
          page: Math.floor(offset / limit) + 1,
          totalPages: Math.max(1, Math.ceil(lake.total / limit)),
          sourceBackend: "r2-lake",
          sourceStatus: "complete",
          publishedRows: lake.total,
          nextCursor: lake.nextCursor,
        }, pageLinks(requestUrl, offset, limit, lake.total));
      }
    } catch {
      // Fall through to the compact projection/degraded response below.
    }
  }
  if (rawRows.length === 0) return null;

  const query = normalized(requestUrl.searchParams.get("q") ?? requestUrl.searchParams.get("query"));
  const from = requestUrl.searchParams.get("from")?.trim() ?? "";
  const to = requestUrl.searchParams.get("to")?.trim() ?? "";
  const entityId = normalized(requestUrl.searchParams.get("entity_id"));
  const kind = requestUrl.searchParams.get("kind")?.trim();
  const validKinds = new Set(["authority", "purchase", "contract", "expense", "budget_execution", "transfer", "audit", "declaration", "lobby", "vote", "attendance", "remuneration"]);
  if (query.length > 80 || from.length > 32 || to.length > 32 || entityId.length > 160 || (kind && !validKinds.has(kind))) {
    return failure("INVALID_QUERY", "Parámetros de consulta inválidos.", 400);
  }
  const rows = rawRows.map((row) => r2Record(row as JsonRecord, source));
  const searchable = (row: JsonRecord) => normalized(JSON.stringify({ id: row.id, title: row.title, description: row.description, data: row.data }));
  const filtered = rows
    .filter((row) => !kind || row.kind === kind)
    .filter((row) => !query || searchable(row).includes(query))
    .filter((row) => !from || String(row.occurredAt ?? "") >= from)
    .filter((row) => !to || String(row.occurredAt ?? "") <= to)
    .filter((row) => !entityId || normalized(JSON.stringify({ subjectEntityIds: row.subjectEntityIds, objectEntityIds: row.objectEntityIds, data: row.data })).includes(entityId))
    .sort((left, right) => String(right.occurredAt ?? "").localeCompare(String(left.occurredAt ?? "")) || String(right.id ?? "").localeCompare(String(left.id ?? "")));
  const limit = limitFrom(requestUrl);
  const offset = offsetFrom(requestUrl);
  const total = filtered.length;
  return success(filtered.slice(offset, offset + limit), {
    total,
    limit,
    page: Math.floor(offset / limit) + 1,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    sourceBackend: "r2",
    sourceStatus: source === "infoprobidad" ? "complete" : "partial",
    publishedRows: rawRows.length,
  }, pageLinks(requestUrl, offset, limit, total));
}

function recordsUnavailable(requestUrl: URL, reason: string) {
  const limit = limitFrom(requestUrl);
  const offset = offsetFrom(requestUrl);
  const source = requestUrl.searchParams.get("source")?.trim() ?? null;
  const expectedTotals: Record<string, number> = { chilecompra: 74142, infolobby: 60523, contraloria: 291, infoprobidad: 15331 };
  return success([], {
    total: 0,
    limit,
    page: Math.floor(offset / limit) + 1,
    totalPages: 1,
    sourceBackend: "none",
    sourceStatus: "temporarily-unavailable",
    availability: "summary-only-or-d1-quota",
    requestedSource: source,
    expectedTotal: source ? expectedTotals[source] ?? null : null,
    reason,
  }, pageLinks(requestUrl, offset, limit, 0));
}

function relation(row: JsonRecord) {
  const evidenceRecordIds = parseJson(row.evidence_record_ids_json);
  return {
    id: row.id,
    fromId: row.from_id,
    predicate: row.predicate,
    toId: row.to_id,
    evidenceRecordIds: Array.isArray(evidenceRecordIds) ? evidenceRecordIds.filter((id): id is string => typeof id === "string") : [],
    period: parseJson(row.period_json) ?? {},
    reconciliation: parseJson(row.reconciliation_json) ?? {},
    disclaimer: row.disclaimer ?? "Una relación documental no implica irregularidad ni responsabilidad.",
  };
}

async function listEntities(requestUrl: URL, env: Env) {
  // El catálogo R2 es la proyección publicada y paginable del directorio.
  // Debe ser la fuente pública principal: listar entidades desde D1 requiere
  // COUNT(*) y ORDER BY sobre todo el universo en cada acceso frío.
  const published = await listEntitiesFromR2(requestUrl, env);
  if (published) return published;
  if (!env.DB) return failure("DATASET_UNAVAILABLE", "El directorio no está disponible temporalmente.", 503);
  const limit = limitFrom(requestUrl);
  const offset = offsetFrom(requestUrl);
  const kind = requestUrl.searchParams.get("kind");
  const query = requestUrl.searchParams.get("q")?.trim();
  const clauses: string[] = [];
  const bindings: string[] = [];
  if (kind) { clauses.push("kind = ?"); bindings.push(kind); }
  if (query) { clauses.push("name LIKE ?"); bindings.push(`%${query.slice(0, 80)}%`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  try {
    const total = await env.DB.prepare(`SELECT count(*) AS total FROM entities ${where}`).bind(...bindings).first<{ total: number }>();
    const rows = await env.DB.prepare(`SELECT * FROM entities ${where} ORDER BY name, id LIMIT ? OFFSET ?`).bind(...bindings, limit, offset).all<JsonRecord>();
    const totalCount = Number(total?.total ?? 0);
    return success((rows.results ?? []).map(entity), { total: totalCount, limit }, pageLinks(requestUrl, offset, limit, totalCount));
  } catch {
    // El plan gratuito de D1 puede agotar rows_read antes del siguiente reset.
    // El catálogo canónico R2 mantiene el directorio consultable sin cargarlo
    // completo en el navegador y evita exponer el error 1101 al público.
    return await listEntitiesFromR2(requestUrl, env) ?? failure("DATABASE_UNAVAILABLE", "La base de datos no está disponible temporalmente.", 503);
  }
}

async function listRecords(requestUrl: URL, env: Env) {
  // The unfiltered endpoint used to execute COUNT(*) + SELECT over the full
  // records table. It is not needed by the public UI (Cruces always sends a
  // source) and can exhaust D1 rows_read when crawlers request it repeatedly.
  // Keep scoped queries and all R2-backed releases available, but fail before
  // touching D1 when no bounded scope was supplied.
  if (env.DB && !hasRecordScope(requestUrl)) return recordsScopeRequired(requestUrl);
  if (!env.DB) return await listRecordsFromR2(requestUrl, env) ?? (requestUrl.searchParams.has("source") || requestUrl.searchParams.has("entity_id") ? recordsUnavailable(requestUrl, "d1-unavailable") : dbUnavailable());
  const limit = limitFrom(requestUrl);
  const offset = offsetFrom(requestUrl);
  const source = requestUrl.searchParams.get("source")?.trim() ?? "";
  const kind = requestUrl.searchParams.get("kind");
  const query = requestUrl.searchParams.get("q")?.trim() ?? requestUrl.searchParams.get("query")?.trim() ?? "";
  const from = requestUrl.searchParams.get("from")?.trim() ?? "";
  const to = requestUrl.searchParams.get("to")?.trim() ?? "";
  const entityId = requestUrl.searchParams.get("entity_id")?.trim() ?? "";
  const validKinds = new Set(["authority", "purchase", "contract", "expense", "budget_execution", "transfer", "audit", "declaration", "lobby", "vote", "attendance", "remuneration"]);
  if (kind && !validKinds.has(kind)) return failure("INVALID_QUERY", "Parámetros de consulta inválidos.", 400, { kind: `Valor no permitido: ${kind}` });
  if (query.length > 80 || from.length > 32 || to.length > 32 || entityId.length > 160) return failure("INVALID_QUERY", "Parámetros de consulta inválidos.", 400);
  const clauses: string[] = [];
  const bindings: string[] = [];
  if (source) { clauses.push("source_id = ?"); bindings.push(source); }
  if (kind) { clauses.push("kind = ?"); bindings.push(kind); }
  if (query) {
    const pattern = `%${query.replace(/[%_]/g, "")}%`;
    clauses.push("(title LIKE ? COLLATE NOCASE OR description LIKE ? COLLATE NOCASE OR data_json LIKE ? COLLATE NOCASE)");
    bindings.push(pattern, pattern, pattern);
  }
  if (from) { clauses.push("occurred_at >= ?"); bindings.push(from); }
  if (to) { clauses.push("occurred_at <= ?"); bindings.push(to); }
  if (entityId) {
    // The JSON columns are retained for compatibility, but filtering them
    // with a leading-wildcard LIKE forces a scan of the whole records table.
    // The materializer already normalizes both sides into indexed tables.
    // Fetch the matching record IDs from the normalized, indexed tables first.
    // An OR-correlated EXISTS still made SQLite scan `records` in production;
    // the IN/UNION shape lets D1 use the entity-leading indexes for both the
    // count and the paged result.
    clauses.push("records.id IN (SELECT record_id FROM record_subjects WHERE entity_id = ? UNION SELECT record_id FROM record_objects WHERE entity_id = ?)");
    bindings.push(entityId, entityId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  try {
    // Para el caso más común (una fuente y paginación), el ETL ya publicó
    // el conteo validado en source_state. Repetir COUNT(*) sobre records
    // consume una fila leída por cada registro de la fuente en cada caché
    // fría, aunque el resultado no haya cambiado. Los filtros adicionales
    // conservan el COUNT exacto porque el contador publicado no los puede
    // representar.
    const sourceOnly = Boolean(source && !kind && !query && !from && !to && !entityId);
    const total = sourceOnly
      ? await env.DB.prepare("SELECT record_count AS total FROM source_state WHERE source_id = ?").bind(source).first<{ total: number }>()
      : await env.DB.prepare(`SELECT count(*) AS total FROM records ${where}`).bind(...bindings).first<{ total: number }>();
    const rows = await env.DB.prepare(`SELECT * FROM records ${where} ORDER BY occurred_at DESC, id LIMIT ? OFFSET ?`).bind(...bindings, limit, offset).all<JsonRecord>();
    const totalCount = Number(total?.total ?? 0);
    return success((rows.results ?? []).map(record), { total: totalCount, limit, page: Math.floor(offset / limit) + 1, totalPages: Math.max(1, Math.ceil(totalCount / limit)) }, pageLinks(requestUrl, offset, limit, totalCount));
  } catch {
    // R2 contiene las proyecciones publicadas que pueden consultarse sin
    // volver a consumir rows_read. Si una fuente sólo tiene resumen, la
    // respuesta 200 degradada lo declara explícitamente y no inventa filas.
    return await listRecordsFromR2(requestUrl, env) ?? (requestUrl.searchParams.has("source") || requestUrl.searchParams.has("entity_id") ? recordsUnavailable(requestUrl, "d1-quota-or-binding") : dbUnavailable());
  }
}

async function listRelations(requestUrl: URL, env: Env, crosses = false) {
  // Las fichas consultan una entidad concreta. Sus relaciones ya viven en
  // los índices JSONL de R2; leerlas primero evita COUNT(*) + SELECT sobre
  // toda la tabla de D1 en cada visita. D1 queda como respaldo para consultas
  // globales o releases antiguos.
  const published = await listRelationsFromR2(requestUrl, env, crosses);
  if (published) return published;
  if (!env.DB) return dbUnavailable();
  const limit = limitFrom(requestUrl);
  const offset = offsetFrom(requestUrl);
  const anchor = requestUrl.searchParams.get("entity_id") ?? requestUrl.searchParams.get("from_id");
  const predicate = requestUrl.searchParams.get("predicate");
  const clauses: string[] = [];
  const bindings: string[] = [];
  if (anchor) { clauses.push("(from_id = ? OR to_id = ?)"); bindings.push(anchor, anchor); }
  if (predicate) { clauses.push("predicate = ?"); bindings.push(predicate); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const total = await env.DB.prepare(`SELECT count(*) AS total FROM relations ${where}`).bind(...bindings).first<{ total: number }>();
  const rows = await env.DB.prepare(`SELECT * FROM relations ${where} ORDER BY id LIMIT ? OFFSET ?`).bind(...bindings, limit, offset).all<JsonRecord>();
  const totalCount = Number(total?.total ?? 0);
  const data = (rows.results ?? []).map((row) => {
    const value = relation(row);
    return crosses ? { relation: value, evidence: value.evidenceRecordIds.map((id) => ({ id })) } : value;
  });
  return success(data, { total: totalCount, limit }, pageLinks(requestUrl, offset, limit, totalCount));
}

async function listRelationsFromR2(requestUrl: URL, env: Env, crosses: boolean): Promise<Response | null> {
  const anchor = requestUrl.searchParams.get("entity_id") ?? requestUrl.searchParams.get("from_id");
  if (!anchor || !env.PUBLIC_DATA) return null;
  try {
    const index = await readR2EntityIndex(env.PUBLIC_DATA, anchor);
    if (!index) return null;
    const predicate = requestUrl.searchParams.get("predicate");
    const filtered = index.relations
      .filter((value) => !predicate || value.predicate === predicate)
      .sort((left, right) => left.id.localeCompare(right.id));
    const limit = limitFrom(requestUrl);
    const offset = offsetFrom(requestUrl);
    const data = filtered.slice(offset, offset + limit).map((value) => crosses
      ? { relation: value, evidence: value.evidenceRecordIds.map((id: string) => ({ id })) }
      : value);
    return success(data, {
      total: filtered.length,
      limit,
      page: Math.floor(offset / limit) + 1,
      sourceBackend: "r2-entity-index",
      sourceStatus: "complete",
    }, pageLinks(requestUrl, offset, limit, filtered.length));
  } catch {
    // Un índice R2 ausente o ilegible no rompe el contrato: se usa el respaldo
    // D1 existente para conservar compatibilidad durante una transición.
    return null;
  }
}

async function search(requestUrl: URL, env: Env) {
  const raw = requestUrl.searchParams.get("q")?.trim() ?? "";
  if (raw.length < 2 || raw.length > 80) return failure("INVALID_QUERY", "La búsqueda debe tener entre 2 y 80 caracteres.", 400);
  if (!env.DB) return dbUnavailable();
  const pattern = `%${raw.replace(/[%_]/g, "")}%`;
  const rows = await env.DB.prepare("SELECT id, kind, name, attributes_json FROM entities WHERE name LIKE ? COLLATE NOCASE ORDER BY name, id LIMIT 75").bind(pattern).all<JsonRecord>();
  const data = (rows.results ?? []).map((row) => {
    const item = entity(row);
    const type = item.kind === "person" ? "persona" : item.kind === "municipality" ? "municipalidad" : item.kind === "supplier" ? "proveedor" : "organismo";
    return { id: item.id, type, nombre: item.name, url: `/entidades/${item.id}`, ...(item.attributes as JsonRecord) };
  });
  return success({ autoridades: data.filter((item) => item.type === "persona").slice(0, 25), municipalidades: data.filter((item) => item.type === "municipalidad").slice(0, 25), funcionarios: [], entidades: data.slice(0, 25) }, { query: raw });
}

async function searchFromR2(requestUrl: URL, env: Env) {
  const raw = requestUrl.searchParams.get("q")?.trim() ?? "";
  if (raw.length < 2 || raw.length > 80) return failure("INVALID_QUERY", "La búsqueda debe tener entre 2 y 80 caracteres.", 400);
  const normalize = (value: unknown) => String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-CL");
  const needle = normalize(raw);
  // Parlamentarios no viven en la tabla nacional de funcionarios CPLT. Se
  // mantienen en el catálogo pequeño y versionado del Worker, por lo que la
  // búsqueda del home sigue encontrando diputados y senadores aunque D1 esté
  // temporalmente sin cuota de lectura.
  const politicians = POLITICOS_SEED
    .filter((politico) => normalize(`${politico.nombre_completo} ${politico.cargo} ${politico.partido_electoral ?? ""} ${politico.distrito_region ?? ""}`).includes(needle))
    .slice(0, 75)
    .map((politico) => ({
      id: politico.id,
      type: "persona",
      nombre: politico.nombre_completo,
      url: `/politico/${politicoSlug(politico.nombre_completo)}`,
      cargo: politico.cargo,
      partido: politico.partido_electoral ?? politico.partido_id,
      region: politico.distrito_region,
    }));
  const rows = await canonicalEntitiesFromR2(env);
  const entities = (rows ?? [])
    .filter((row) => normalize(row.name).includes(needle))
    .slice(0, 75)
    .map((row) => {
      const item = entity(row);
      const type = item.kind === "person" ? "persona" : item.kind === "municipality" ? "municipalidad" : item.kind === "supplier" ? "proveedor" : "organismo";
      return { id: item.id, type, nombre: item.name, url: `/entidades/${item.id}`, ...(item.attributes as JsonRecord) };
    });
  // Merge the two catalogs by normalized name. The canonical catalog may have
  // the same person under an entity id while the parliamentary catalog has the
  // richer /politico route; keep only one visible result in that case.
  const merged = new Map<string, (typeof entities)[number]>();
  for (const item of entities) merged.set(normalize(item.nombre), item);
  for (const item of politicians) {
    const key = normalize(item.nombre);
    const current = merged.get(key);
    if (!current || current.url.startsWith("/entidades/")) merged.set(key, item);
  }
  const data = [...merged.values()].slice(0, 75);
  if (data.length === 0 && !rows) return dbUnavailable();
  return success({ autoridades: data.filter((item) => item.type === "persona").slice(0, 25), municipalidades: data.filter((item) => item.type === "municipalidad").slice(0, 25), funcionarios: [], entidades: data.slice(0, 25) }, { query: raw, sourceStatus: "r2-catalog" });
}

async function listTransferencias(requestUrl: URL, env: Env) {
  const rawPage = Number(requestUrl.searchParams.get("page") ?? 1);
  const rawLimit = Number(requestUrl.searchParams.get("limit") ?? 10);
  const page = Number.isInteger(rawPage) ? Math.max(1, Math.min(rawPage, 10_000)) : 1;
  const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(rawLimit, 100)) : 10;
  const search = (requestUrl.searchParams.get("q") ?? requestUrl.searchParams.get("search") ?? "").trim();
  const year = (requestUrl.searchParams.get("year") ?? "").trim();
  const emisor = (requestUrl.searchParams.get("emisor") ?? "").trim();
  if (search.length > 80 || year.length > 20 || emisor.length > 160) return failure("INVALID_QUERY", "Parámetros de consulta inválidos.", 400);

  // R2 is the published, checksummed release and is the cost-safe default.
  // The former D1-first path performed an unfiltered COUNT plus a filtered
  // COUNT for every uncached query, which could exhaust the free-tier
  // rows_read quota even when the complete release was already in R2. D1 is
  // retained for an explicit operational validation/contingency only.
  if (env.PREFER_TRANSFER_D1 !== "1") return listTransferenciasFromR2(requestUrl, env);

  const sort = requestUrl.searchParams.get("sort") === "fecha" ? "fecha" : "monto_clp";
  const order = requestUrl.searchParams.get("order") === "asc" ? "ASC" : "DESC";
  const transferDb = env.TRANSFERS_DB ?? env.DB;
  if (!transferDb) return listTransferenciasFromR2(requestUrl, env);
  const manifest = await transferManifest(env);
  if (!manifest) return listTransferenciasFromR2(requestUrl, env);
  const clauses: string[] = [];
  const bindings: (string | number)[] = [];
  if (year && year !== "Todos") { clauses.push("periodo = ?"); bindings.push(year); }
  if (emisor && emisor !== "Todos") { clauses.push("emisor_nombre = ?"); bindings.push(emisor); }
  if (search) {
    const term = `%${search.replace(/[%_]/g, "")}%`;
    clauses.push("(emisor_nombre LIKE ? OR receptor_nombre LIKE ? OR materia LIKE ? OR emisor_rut LIKE ? OR receptor_rut LIKE ? OR comuna LIKE ?)");
    bindings.push(term, term, term, term, term, term);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  try {
    const universe = await transferDb.prepare("SELECT COUNT(*) AS total FROM transferencias_19862").first<{ total: number }>();
    const release = await transferDb.prepare("SELECT checksum_sha256 FROM transferencias_19862_release WHERE singleton = 1").first<{ checksum_sha256: string }>();
    if (Number(universe?.total ?? 0) !== manifest.totalRows || release?.checksum_sha256 !== manifest.checksumSha256) return listTransferenciasFromR2(requestUrl, env);
    const count = await transferDb.prepare(`SELECT COUNT(*) AS total FROM transferencias_19862 ${where}`).bind(...bindings).first<{ total: number }>();
    const total = Number(count?.total ?? 0);
    const offset = (page - 1) * limit;
    const rows = await transferDb.prepare(`SELECT id, fecha, periodo, emisor_nombre, emisor_rut, receptor_nombre, receptor_rut, materia, monto_clp, url_registro, clasificacion, comuna FROM transferencias_19862 ${where} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`).bind(...bindings, limit, offset).all<JsonRecord>();
    const data = (rows.results ?? []).map((row) => ({
      id: row.id,
      fecha: row.fecha ?? null,
      period: row.periodo ?? null,
      title: row.materia ?? null,
      description: null,
      classification: row.clasificacion ?? null,
      emitter_name: row.emisor_nombre ?? null,
      emitter_rut: row.emisor_rut ?? null,
      receiver_name: row.receptor_nombre ?? null,
      receiver_rut: row.receptor_rut ?? null,
      monto_clp: Number(row.monto_clp ?? 0),
      url: row.url_registro ?? null,
      municipality: row.comuna ?? null,
    }));
    if (total > 0 || data.length > 0) {
      const kpis = manifest.expected
        ? { total_monto_clp: manifest.expected.totalMontoClp ?? 0, total_transfers: manifest.totalRows, total_receptores: manifest.expected.totalReceptores ?? 0, total_emisores: manifest.expected.totalEmisores ?? 0 }
        : { total_monto_clp: 0, total_transfers: total, total_receptores: 0, total_emisores: 0 };
      return json({ data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)), kpis, by_year: {}, sourceStatus: "d1" }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=3600, stale-while-revalidate=86400" } });
    }
    return listTransferenciasFromR2(requestUrl, env);
  } catch {
    return listTransferenciasFromR2(requestUrl, env);
  }
}

function exportEntityRow(row: JsonRecord) {
  const attributes = (parseJson(row.attributes_json ?? row.attributes) as JsonRecord | null) ?? {};
  const sourceIds = parseJson(row.source_ids_json ?? row.sourceIds);
  return {
    id: row.id,
    nombre_completo: row.name,
    cargo: attributes.cargo ?? attributes.position ?? attributes.office ?? "",
    partido_sigla: attributes.partido_sigla ?? attributes.party ?? "IND",
    distrito_region: attributes.distrito_region ?? attributes.region ?? "",
    fuente: attributes.fuente ?? null,
    evidencia_etl: Array.isArray(sourceIds) ? sourceIds.length : 0,
  };
}

function exportEntityResponse(data: JsonRecord[], format: "csv" | "json", snapshot: string) {
  const meta = { version: "v1", snapshot_etl: snapshot };
  if (format === "json") {
    return json({ data, meta }, { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200", "Content-Disposition": "attachment; filename=transparencia_chile.json" } });
  }
  const header = "id,nombre_completo,cargo,partido_sigla,distrito_region,fuente,evidencia_etl";
  const body = data.map((row) => [row.id, row.nombre_completo, row.cargo, row.partido_sigla, row.distrito_region, row.fuente, row.evidencia_etl].map(csvCell).join(",")).join("\n");
  return new Response(`${header}\n${body}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200", "Content-Disposition": "attachment; filename=transparencia_chile.csv", "X-Content-Type-Options": "nosniff" } });
}

async function exportEntitiesFromR2(requestUrl: URL, env: Env, format: "csv" | "json") {
  const rows = await canonicalEntitiesFromR2(env);
  if (!rows) return null;
  const requestedLimit = Number(requestUrl.searchParams.get("limit") ?? 205);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 205) : 205;
  const cargo = (requestUrl.searchParams.get("cargo") ?? "").trim().toLowerCase();
  const data = rows
    .filter((row) => row.kind === "person")
    .map(exportEntityRow)
    .filter((row) => !cargo || String(row.cargo).toLowerCase().includes(cargo))
    .sort((left, right) => String(left.nombre_completo ?? "").localeCompare(String(right.nombre_completo ?? ""), "es-CL") || String(left.id ?? "").localeCompare(String(right.id ?? "")))
    .slice(0, limit);
  return exportEntityResponse(data, format, "r2-catalog");
}

async function exportData(requestUrl: URL, env: Env) {
  const format = requestUrl.searchParams.get("format");
  if (format !== "csv" && format !== "json") return failure("MISSING_PARAMETERS", "Filtros obligatorios: format=csv o format=json.", 400);
  if (requestUrl.searchParams.get("dataset") === "funcionarios") return exportFuncionarios(requestUrl, env, format);
  if (!env.DB) return await exportEntitiesFromR2(requestUrl, env, format) ?? dbUnavailable();
  const requestedLimit = Number(requestUrl.searchParams.get("limit") ?? 205);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 205) : 205;
  const cargo = (requestUrl.searchParams.get("cargo") ?? "").trim().toLowerCase();
  try {
    const rows = await env.DB.prepare("SELECT id, name, kind, attributes_json, source_ids_json FROM entities WHERE kind = ? ORDER BY name, id LIMIT ?").bind("person", 205).all<JsonRecord>();
    const data = (rows.results ?? []).map(exportEntityRow)
      .filter((row) => !cargo || String(row.cargo).toLowerCase().includes(cargo))
      .slice(0, limit);
    if (data.length > 0) return exportEntityResponse(data, format, "worker-d1");
  } catch {
    // El catálogo R2 es el release público validado y evita que el agotamiento
    // de rows_read convierta una exportación de lectura en un 503.
  }
  return await exportEntitiesFromR2(requestUrl, env, format) ?? dbUnavailable();
}

async function exportFuncionarios(requestUrl: URL, env: Env, format: "csv" | "json") {
  const limitValue = Number(requestUrl.searchParams.get("limit") ?? 100);
  const limit = Number.isInteger(limitValue) ? Math.min(Math.max(limitValue, 1), 500) : 100;
  const pageValue = Number(requestUrl.searchParams.get("page") ?? 1);
  const page = Number.isInteger(pageValue) ? Math.max(1, Math.min(pageValue, 100_000)) : 1;
  const sourceUrl = new URL(requestUrl);
  sourceUrl.searchParams.set("page", String(page));
  sourceUrl.searchParams.set("limit", String(limit));
  // The complete national directory is published as a paginated R2 index.
  // Keep D1 only as a rescue path for an unavailable R2 release; exporting a
  // block must never start with COUNT/SELECT over the 1.2M-row table.
  const r2Response = await listFuncionariosFromR2(sourceUrl, env);
  const response = r2Response.status < 500
    ? r2Response
    : await listFuncionariosFromD1(sourceUrl, env) ?? r2Response;
  if (!response.ok) return response;
  const payload = await response.json() as JsonRecord;
  const data = Array.isArray(payload.data) ? payload.data as JsonRecord[] : [];
  const filename = `funcionarios-bloque-${String(page).padStart(5, "0")}`;
  if (format === "json") {
    return json({ data, meta: { ...(payload.meta as JsonRecord ?? {}), export: "segmentada", block: page } }, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=3600", "Content-Disposition": `attachment; filename=${filename}.json` },
    });
  }
  const columns = ["id", "nombre_completo", "cargo", "organo_nombre", "tipo_contrato", "estamento", "remuneracion_bruta_mensual", "fecha_ingreso"];
  const body = data.map((row) => columns.map((column) => csvCell(row[column])).join(",")).join("\n");
  return new Response(`${columns.join(",")}\n${body}\n`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=3600", "Content-Disposition": `attachment; filename=${filename}.csv`, "X-Content-Type-Options": "nosniff" } });
}

async function listSources(requestUrl: URL, env: Env) {
  // El inventario y el estado de publicación ya se generan en R2. Usarlos
  // primero evita repetir una consulta al catálogo D1 en cada expiración de
  // caché y mantiene la página de fuentes disponible durante un agotamiento
  // de rows_read.
  const published = await listSourcesFromR2(requestUrl, env);
  if (published) return published;
  if (!env.DB) return dbUnavailable();
  try {
    const rows = await env.DB.prepare(`
      SELECT
        sources.*,
        source_state.status AS state_status,
        source_state.record_count AS state_record_count,
        source_state.checksum_sha256 AS state_checksum_sha256,
        source_state.generated_at AS state_generated_at,
        source_state.last_success_at AS state_last_success_at,
        source_state.published_version AS state_published_version
      FROM sources
      LEFT JOIN source_state ON source_state.source_id = sources.id
      ORDER BY sources.id
    `).all<JsonRecord>();
    const data = (rows.results ?? []).map((row) => {
      const stateCount = Number(row.state_record_count ?? 0);
      const stateStatus = String(row.state_status ?? "");
      const archiveOnly = stateStatus === "archive_only";
      // source_state es el contador de publicación validado por el ETL. No
      // volver a contar records aquí: el histórico puede superar el millón
      // de filas y ese COUNT(*) por fuente agota rápidamente el cupo diario
      // gratuito de D1 cuando el catálogo se consulta repetidamente.
      const recordCount = stateCount;
      const status = archiveOnly ? "partial" : recordCount > 0 ? "connected" : "unavailable";
      return {
        ...row,
        state_status: undefined,
        state_record_count: undefined,
        state_checksum_sha256: undefined,
        state_generated_at: undefined,
        state_last_success_at: undefined,
        state_published_version: undefined,
        recordCount,
        status,
        checksumSha256: row.state_checksum_sha256 ?? null,
        lastUpdated: row.state_last_success_at ?? row.state_generated_at ?? null,
        publishedVersion: row.state_published_version ?? null,
        statusDetail: archiveOnly
          ? "Histórico íntegro en R2; se consulta bajo demanda para preservar capacidad en D1."
          : recordCount > 0 ? "Datos cargados desde D1" : "Sin datos publicados.",
      };
    });
    return success(data, { total: data.length }, { self: requestUrl.toString() });
  } catch {
    // El catálogo R2 mantiene el estado de las fuentes disponible aunque el
    // límite diario de D1 esté temporalmente agotado. No repetir otra consulta
    // a D1 en este camino, porque sólo aumentaría rows_read sin recuperar el
    // servicio.
    return await listSourcesFromR2(requestUrl, env) ?? dbUnavailable();
  }
}

async function listSourcesFromR2(requestUrl: URL, env: Env) {
  const [inventory, health, transferRelease] = await Promise.all([
    r2Json<{ sources?: JsonRecord[] }>(env.PUBLIC_DATA, "projections/sources-v1/source-inventory.json"),
    r2Json<{ sources?: Record<string, JsonRecord> }>(env.PUBLIC_DATA, "projections/sources-v1/source-health.json"),
    r2Json<TransferApiManifest>(env.PUBLIC_DATA, "projections/transferencias-v1/manifest.json"),
  ]);
  if (!inventory?.sources?.length && !health?.sources) return null;
  // El inventario histórico conserva dos identificadores que ya no deben
  // aparecer como fuentes separadas: `ley19862` es el alias antiguo de
  // `ley-19862`, y `transparencia-activa` es un catálogo legado del portal
  // que no tiene un release publicado en el lake. Si se dejan pasar ambos,
  // la landing muestra 13 fuentes y dos estados "sin conexión" aunque el
  // universo publicado sea el de 12 fuentes con datos.
  const canonicalSourceId = (value: string) => {
    if (value === "ley19862") return "ley-19862";
    return value;
  };
  const legacyInventoryIds = new Set(["transparencia-activa"]);
  const inventoryById = new Map<string, JsonRecord>();
  for (const source of inventory?.sources ?? []) {
    const rawId = String(source.id ?? "");
    if (!rawId || legacyInventoryIds.has(rawId)) continue;
    const id = canonicalSourceId(rawId);
    inventoryById.set(id, { ...(inventoryById.get(id) ?? {}), ...source, id });
  }
  const healthById = new Map<string, JsonRecord>();
  for (const [rawId, state] of Object.entries(health?.sources ?? {})) {
    if (legacyInventoryIds.has(rawId)) continue;
    const id = canonicalSourceId(rawId);
    healthById.set(id, { ...(healthById.get(id) ?? {}), ...state });
  }
  const ids = [...new Set([...inventoryById.keys(), ...healthById.keys()])].sort();
  const labels: Record<string, string> = {
    camara: "Cámara", chilecompra: "ChileCompra OCDS", cplt: "Transparencia Activa CPLT",
    contraloria: "Contraloría General", dipres: "DIPRES", ine: "INE Censo 2024",
    infolobby: "InfoLobby", infoprobidad: "InfoProbidad", "ley-19862": "Ley 19.862",
    senado: "Senado", servel: "SERVEL", sinim: "SINIM",
  };
  // Ley 19.862 mantiene un catálogo histórico separado del release paginado
  // que sirve /api/v1/transferencias. El catálogo de salud puede quedar
  // atrasado después de una publicación incremental; el manifest completo es
  // la autoridad para total, checksum y fecha pública, y además evita D1.
  const currentTransferRelease = isCompleteTransferManifest(transferRelease) ? transferRelease : null;
  const data = ids.map((id) => {
    const source = inventoryById.get(id) ?? {};
    const state = healthById.get(id) ?? {};
    const isTransferSource = id === "ley-19862";
    const recordCount = isTransferSource && currentTransferRelease
      ? currentTransferRelease.totalRows
      : Number(state.recordCount ?? source.recordCount ?? 0);
    const stateStatus = String(state.status ?? source.status ?? "unavailable");
    return {
      ...source,
      id,
      label: source.label ?? labels[id] ?? id,
      recordCount,
      status: stateStatus === "archive_only" ? "partial" : recordCount > 0 ? "connected" : "unavailable",
      checksumSha256: isTransferSource && currentTransferRelease
        ? currentTransferRelease.checksumSha256
        : state.checksumSha256 ?? source.indexChecksumSha256 ?? null,
      lastUpdated: isTransferSource && currentTransferRelease
        ? currentTransferRelease.generatedAt
        : state.lastSuccessAt ?? state.last_success_at ?? state.generatedAt ?? source.generatedAt ?? null,
      statusDetail: stateStatus === "archive_only"
        ? "Histórico íntegro en R2; se consulta bajo demanda."
        : recordCount > 0 ? "Datos publicados en el lake." : "Sin datos publicados.",
    };
  });
  return success(data, { total: data.length }, { self: requestUrl.toString() });
}

function svgResponse(title: string) {
  const safe = title.replace(/[<&>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[char] ?? char);
  const body = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#0d1929"/><text x="80" y="250" fill="#63c5da" font-family="Arial,sans-serif" font-size="34" font-weight="700">EL CAMBIÓMETRO</text><text x="80" y="330" fill="#f8fafc" font-family="Arial,sans-serif" font-size="46" font-weight="700">${safe}</text></svg>`;
  return new Response(body, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=86400", "X-Content-Type-Options": "nosniff" } });
}

function validateOfficials(url: URL) {
  const query = (url.searchParams.get("query") ?? "").trim();
  const contrato = url.searchParams.get("contrato") ?? "Todos";
  const sortBy = url.searchParams.get("sortBy") ?? "sueldo_desc";
  if (query.length > 80 || (query.length > 0 && query.length < 2)) return "La busqueda debe tener entre 2 y 80 caracteres.";
  if (!/^(?:Todos|[a-z0-9][a-z0-9_-]{0,159})$/.test(url.searchParams.get("muni") ?? url.searchParams.get("organismo") ?? "Todos")) return "Organismo invalido.";
  if (!["Todos", "Planta", "Contrata", "Honorarios", "CodigoTrabajo", "Codigo del Trabajo"].includes(contrato)) return "Tipo de contrato invalido.";
  if (!["sueldo_desc", "sueldo_asc", "horas_extras_desc", "nombre_asc", "nombre_desc"].includes(sortBy)) return "Orden invalido.";
  return null;
}

async function requestSubmission(request: Request, env: Env) {
  if (env.READ_ONLY_PREVIEW === "1") return failure("READ_ONLY_PREVIEW", "El preview remoto sólo permite lecturas.", 503);
  if (!env.DB) return dbUnavailable();
  let body: JsonRecord;
  try { body = await request.json() as JsonRecord; } catch { return failure("INVALID_BODY", "El cuerpo debe ser JSON válido.", 400); }
  const tipo = typeof body.tipo === "string" ? body.tipo : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const descripcion = typeof body.descripcion === "string" ? body.descripcion.trim() : "";
  const nombre = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 120) : "";
  const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken.trim() : "";
  if (!new Set(["rectificacion", "cancelacion", "oposicion", "acceso", "informacion", "otro"]).has(tipo)) return failure("INVALID_TYPE", "Tipo de solicitud no válido.", 400);
  if (!/^[^@\s]{1,120}@[^@\s]{1,120}\.[A-Za-z]{2,}$/.test(email)) return failure("INVALID_EMAIL", "Correo electrónico no válido.", 400);
  if (descripcion.length < 10 || descripcion.length > 4000) return failure("INVALID_DESCRIPTION", "La descripción debe tener entre 10 y 4000 caracteres.", 400);
  if (body.website) return failure("SPAM_DETECTED", "Solicitud rechazada.", 400);
  if (!turnstileToken) return failure("TURNSTILE_REQUIRED", "Completa el desafío de verificación para enviar la solicitud.", 400);
  if (turnstileToken.length > 2048) return failure("TURNSTILE_INVALID", "El desafío de verificación no es válido.", 400);
  if (!env.TURNSTILE_SECRET_KEY) return failure("TURNSTILE_NOT_CONFIGURED", "La verificación anti-bots no está configurada. Intenta más tarde.", 503);

  const remoteIp = request.headers.get("CF-Connecting-IP") ?? "";
  const turnstileBody = new FormData();
  turnstileBody.set("secret", env.TURNSTILE_SECRET_KEY);
  turnstileBody.set("response", turnstileToken);
  if (remoteIp) turnstileBody.set("remoteip", remoteIp);
  let turnstileResult: { success?: boolean };
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: turnstileBody,
    });
    turnstileResult = await response.json() as { success?: boolean };
  } catch {
    return failure("TURNSTILE_UNAVAILABLE", "No fue posible validar el desafío. Intenta nuevamente.", 503);
  }
  if (!turnstileResult.success) return failure("TURNSTILE_FAILED", "El desafío de verificación expiró o no fue válido. Complétalo nuevamente.", 400);
  if (!env.EMAIL) return failure("EMAIL_NOT_CONFIGURED", "El canal de correo no está configurado. Intenta más tarde.", 503);

  const ipDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${env.TURNSTILE_SECRET_KEY}:${remoteIp || "unknown"}`));
  const ipHash = Array.from(new Uint8Array(ipDigest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const result = await env.DB.prepare("INSERT INTO data_requests (tipo, nombre, email, descripcion, ip_hash, estado) VALUES (?, ?, ?, ?, ?, 'recibida')").bind(tipo, nombre, email, descripcion, ipHash).run();
  const id = result.meta?.last_row_id ?? null;
  const escapeHtml = (value: string) => value.replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char] ?? char);
  try {
    await env.EMAIL.send({
      to: PRIVACY_REQUEST_RECIPIENT,
      from: { email: PRIVACY_REQUEST_SENDER, name: "El Cambiómetro" },
      replyTo: email,
      subject: `Solicitud de privacidad #${id ?? "nueva"} · ${tipo}`,
      text: `Tipo: ${tipo}\nNombre: ${nombre || "No informado"}\nCorreo: ${email}\n\n${descripcion}`,
      html: `<h2>Nueva solicitud de privacidad</h2><p><strong>Tipo:</strong> ${escapeHtml(tipo)}</p><p><strong>Nombre:</strong> ${escapeHtml(nombre || "No informado")}</p><p><strong>Correo:</strong> ${escapeHtml(email)}</p><p><strong>Descripción:</strong></p><p>${escapeHtml(descripcion).replace(/\n/g, "<br>")}</p>`,
    });
  } catch {
    return json({ data: { id, estado: "recibida", notificacion: "pendiente" } }, { status: 202, headers: { "Cache-Control": "no-store" } });
  }
  return json({ data: { id, estado: "recibida", notificacion: "enviada" } }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: JSON_HEADERS });
    if (path === "/api/push") return request.method === "GET" ? json({ enabled: false }) : failure("METHOD_NOT_ALLOWED", "Método no permitido.", 405);
    if (path === "/api/og/site") return svgResponse("Transparencia pública de Chile");
    if (path.startsWith("/api/og/")) return svgResponse("Ficha pública");
    if (path === "/api/csp-report") return request.method === "POST" ? json({ ok: true }, { status: 202, headers: { "Cache-Control": "no-store" } }) : failure("METHOD_NOT_ALLOWED", "Método no permitido.", 405);
    if (path === "/api/v1/requests") return request.method === "POST" ? requestSubmission(request, env) : failure("METHOD_NOT_ALLOWED", "Método no permitido.", 405);
    if (request.method !== "GET") return failure("METHOD_NOT_ALLOWED", "Método no permitido.", 405);
    if (path === "/api/v1/search") {
      const limited = await rateLimit(request, env, "search");
      return limited ?? cachedPublicGet(request, async () => {
        const r2 = await searchFromR2(url, env);
        return r2.status < 500 ? r2 : databaseSafe(search(url, env));
      });
    }
    if (path === "/api/v1/transferencias") {
      const limited = await rateLimit(request, env, "transferencias");
      return limited ?? listTransferencias(url, env);
    }
    if (path === "/api/directorio" || path === "/api/v1/entities") {
      const limited = await rateLimit(request, env, "entities");
      return limited ?? cachedPublicGet(request, () => listEntities(url, env));
    }
    if (path === "/api/v1/records") {
      const limited = await rateLimit(request, env, "records");
      return limited ?? cachedPublicGet(request, async () => {
        // Los releases de gastos son completos, versionados y ya están en R2.
        // Consultarlos primero evita consumir rows_read de D1 y mantiene el
        // contrato público disponible cuando la cuota gratuita se agota.
        const expenseSource = url.searchParams.get("source")?.startsWith("gastos_");
        const expenseKind = url.searchParams.get("kind") === "expense";
        if (expenseSource || expenseKind) {
          const r2 = await listExpensesFromR2(url, env);
          if (r2) return r2;
        }
        // These releases have complete, checksummed R2 indexes. Use them as
        // the public path so a normal browse/search does not spend D1
        // rows_read on a COUNT(*) plus a second paginated SELECT.
        const r2FirstSources = new Set(["chilecompra", "infolobby", "contraloria"]);
        if (r2FirstSources.has(url.searchParams.get("source")?.trim() ?? "")) {
          const r2 = await listRecordsFromR2(url, env);
          if (r2 && r2.status < 500) return r2;
        }
        return databaseSafe(listRecords(url, env));
      });
    }
    if (path === "/api/v1/relations") {
      const limited = await rateLimit(request, env, "relations");
      return limited ?? cachedPublicGet(request, () => databaseSafe(listRelations(url, env)));
    }
    if (path === "/api/v1/crosses") {
      const limited = await rateLimit(request, env, "crosses");
      return limited ?? cachedPublicGet(request, () => databaseSafe(listRelations(url, env, true)));
    }
    if (path === "/api/v1/alertas") return success([]);
    if (path === "/api/v1/commercial/keys") return failure("COMMERCIAL_API_UNAVAILABLE", "La API comercial no está disponible.", 503);
    if (path === "/api/v1/health") return health(env);
    if (path === "/api/v1/health/data") {
      return health(env);
    }
    if (path === "/api/v1/sources") {
      const limited = await rateLimit(request, env, "sources");
      return limited ?? cachedPublicGet(request, () => databaseSafe(listSources(url, env)));
    }
    if (path === "/api/v1/export") {
        const limited = await rateLimit(request, env, "export");
        return limited ?? cachedPublicGet(request, () => databaseSafe(exportData(url, env)));
      }
    if (path === "/api/funcionarios" || path === "/api/v1/funcionarios") {
      const invalid = validateOfficials(url);
      if (invalid) return failure("INVALID_QUERY", invalid, 400);
      const limited = await rateLimit(request, env, "funcionarios");
      if (limited) return limited;
      // El universo nacional vive en el índice paginado de R2. Consultar D1
      // primero obliga a contar/leer hasta 1,2M filas y puede agotar el cupo
      // gratuito de rows_read antes de llegar al fallback canónico. R2 es la
      // fuente primaria; D1 sólo rescata un release R2 ausente o incompleto.
      const r2 = await listFuncionariosFromR2(url, env);
      if (r2.status < 500) return r2;
      const d1 = await listFuncionariosFromD1(url, env);
      return d1 ?? r2;
    }
    if (path.startsWith("/api/v1/politico/")) {
      return cachedPublicGet(request, async () => {
        if (!env.DB) return dbUnavailable();
        const id = decodeURIComponent(path.split("/").at(-1) ?? "");
        let row: JsonRecord | null = null;
        try {
          row = await env.DB.prepare("SELECT * FROM politicos WHERE id = ? LIMIT 1").bind(id).first<JsonRecord>();
        } catch {
          // A partially migrated or briefly locked legacy table must not turn
          // the public roster endpoint into a 500 when the compact seed can
          // still serve the canonical politician identity.
          row = null;
        }
        // The current ETL publishes canonical people in `entities`; the legacy
        // `politicos` table may be empty while migrations are being rolled out.
        // Keep the public legacy contract available from the compact roster,
        // while records/evidence continue to come from D1/R2 endpoints.
        if (!row) {
          const seed = POLITICOS_SEED.find((candidate) => candidate.id === id);
          if (seed) {
            row = {
              id: seed.id,
              nombre_completo: seed.nombre_completo,
              cargo: seed.cargo,
              partido_id: seed.partido_id,
              distrito_region: seed.distrito_region,
              numero_distrito: seed.numero_distrito ?? null,
            };
          }
        }
        return row
          ? success(politico(row), { id, snapshot_etl: { generatedAtChile: row.updated_at ?? "Agosto 2026" } }, { self: url.toString() })
          : failure("NOT_FOUND", "Político no encontrado.", 404, { id });
      });
    }
    if (path.startsWith("/api/v1/entities/")) {
      return cachedPublicGet(request, async () => {
        if (!env.DB) return dbUnavailable();
        const id = decodeURIComponent(path.split("/").at(-1) ?? "");
        const row = await env.DB.prepare("SELECT * FROM entities WHERE id = ? LIMIT 1").bind(id).first<JsonRecord>();
        return row ? success(entity(row), { id }, { self: url.toString() }) : failure("NOT_FOUND", "Entidad no encontrada.", 404, { id });
      });
    }
    return failure("NOT_FOUND", "Ruta no encontrada.", 404);
  },
};
