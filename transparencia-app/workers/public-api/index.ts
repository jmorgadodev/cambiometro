import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

import { POLITICOS_SEED } from "../../lib/politicos-source";

export interface Env {
  DB?: D1Database;
  TRANSFERS_DB?: D1Database;
  PUBLIC_DATA?: R2Bucket;
  TURNSTILE_SECRET_KEY?: string;
  READ_ONLY_PREVIEW?: string;
  EXPENSIVE_API_RATE_LIMITER?: { limit(input: { key: string }): Promise<{ success: boolean }> };
}

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

interface OfficialsSearchIndex {
  schemaVersion: number;
  totalRows: number;
  pageSize: number;
  pages: Array<{ page: number; key: string; count: number }>;
  shards: Record<string, string>;
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

async function r2Json<T>(bucket: R2Bucket | undefined, key: string): Promise<T | null> {
  if (!bucket) return null;
  const object = await bucket.get(key);
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
  let d1TransferRows = 0;
  let d1ReleaseChecksum: string | null = null;
  if (transferD1) {
    try {
      const result = await transferDb?.prepare("SELECT count(*) AS total FROM transferencias_19862").first<{ total: number }>();
      d1TransferRows = Number(result?.total ?? 0);
    } catch {
      d1TransferRows = 0;
    }
    try {
      const release = await transferDb?.prepare("SELECT checksum_sha256 FROM transferencias_19862_release WHERE singleton = 1").first<{ checksum_sha256: string }>();
      d1ReleaseChecksum = release?.checksum_sha256 ?? null;
    } catch {
      d1ReleaseChecksum = null;
    }
  }
  // The dedicated transfer projection is preferred when available. R2 remains
  // the canonical fallback so a partial refresh never takes the public API
  // offline.
  const d1Consistent = Boolean(transferD1 && manifest && d1TransferRows === manifest.totalRows && d1ReleaseChecksum === manifest.checksumSha256);
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
    transferSource: d1Consistent ? "d1" : "r2",
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
  const allRecords = period !== "Todos" ? rows.filter((row) => String(row.fuente_periodo ?? row.periodo ?? "") === period) : rows;
  const withoutPayment = allRecords.filter((row) => officialSalary(row) <= 0);
  const microAmount = allRecords.filter((row) => officialSalary(row) > 0 && officialSalary(row) < 50_000);
  const completeSalary = allRecords.filter((row) => officialSalary(row) >= 50_000);
  let filtered = includeZero ? [...allRecords] : onlyAnomalies ? [...microAmount] : allRecords.filter((row) => officialSalary(row) > 0);
  if (query) filtered = filtered.filter((row) => normalized(`${row.nombre_completo ?? ""} ${row.cargo ?? ""} ${row.organo_nombre ?? ""} ${row.formacion ?? ""}`).includes(query));
  if (type && type !== "todos") filtered = filtered.filter((row) => normalized(row.organo_tipo).includes(type));
  if (contract !== "Todos") filtered = filtered.filter((row) => normalized(row.tipo_contrato).includes(normalized(contract)));
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
  const page = Number.isInteger(pageValue) ? Math.max(1, Math.min(pageValue, 1_000)) : 1;
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
  const clauses: string[] = [];
  const bindings: (string | number)[] = [];
  if (organism !== "Todos") { clauses.push("organo_id = ?"); bindings.push(organism); }
  if (query) { const pattern = `%${query.replace(/[%_]/g, "")}%`; clauses.push("(nombre_completo LIKE ? COLLATE NOCASE OR cargo LIKE ? COLLATE NOCASE OR organo_id LIKE ? COLLATE NOCASE)"); bindings.push(pattern, pattern, pattern); }
  if (contract !== "Todos") { clauses.push("tipo_contrato = ?"); bindings.push(contract); }
  if (estamento !== "Todos") { clauses.push("estamento LIKE ? COLLATE NOCASE"); bindings.push(`%${estamento.replace(/[%_]/g, "")}%`); }
  if (type !== "Todos") { clauses.push("organo_tipo LIKE ? COLLATE NOCASE"); bindings.push(`%${type.replace(/[%_]/g, "")}%`); }
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
  } catch (error) {
    if (String(error).match(/no such table|no such column|internal error/i)) return null;
    throw error;
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
    const page = Number.isInteger(requestedPage) ? Math.max(1, Math.min(requestedPage, index.pages.length)) : 1;
    let rows: JsonRecord[] = [];
    if (query) {
      const first = query.replace(/^[^a-z0-9]+/i, "").charAt(0) || "_";
      const shardKey = index.shards?.[first] ?? index.shards?.[first.toLocaleLowerCase("es-CL")];
      if (shardKey) rows = compactOfficialRows(await r2Json<CompactOfficialRow[]>(env.PUBLIC_DATA, shardKey));
    } else {
      const pageKey = index.pages.find((item) => item.page === page)?.key;
      if (pageKey) rows = compactOfficialRows(await r2Json<CompactOfficialRow[]>(env.PUBLIC_DATA, pageKey));
    }
    const response = officialsResponse(rows, requestUrl, manifest.generatedAt, "r2-search", "Todos");
    if (!query && rows.length > 0) {
      const payload = await response.json() as JsonRecord;
      const meta = (payload.meta as JsonRecord) ?? {};
      meta.total = index.totalRows;
      meta.totalHeadcount = index.totalRows;
      meta.page = page;
      meta.totalPages = index.pages.length;
      payload.meta = meta;
      return json(payload, { headers: { "Cache-Control": "public, max-age=30, s-maxage=3600, stale-while-revalidate=86400" } });
    }
    return response;
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
  if (!cursor) return 0;
  const match = /^v1_(\d+)$/.exec(cursor);
  return match ? Number(match[1]) : 0;
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
  if (!env.DB) return dbUnavailable();
  const limit = limitFrom(requestUrl);
  const offset = offsetFrom(requestUrl);
  const kind = requestUrl.searchParams.get("kind");
  const query = requestUrl.searchParams.get("q")?.trim();
  const clauses: string[] = [];
  const bindings: string[] = [];
  if (kind) { clauses.push("kind = ?"); bindings.push(kind); }
  if (query) { clauses.push("name LIKE ?"); bindings.push(`%${query.slice(0, 80)}%`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const total = await env.DB.prepare(`SELECT count(*) AS total FROM entities ${where}`).bind(...bindings).first<{ total: number }>();
  const rows = await env.DB.prepare(`SELECT * FROM entities ${where} ORDER BY name, id LIMIT ? OFFSET ?`).bind(...bindings, limit, offset).all<JsonRecord>();
  const totalCount = Number(total?.total ?? 0);
  return success((rows.results ?? []).map(entity), { total: totalCount, limit }, pageLinks(requestUrl, offset, limit, totalCount));
}

async function listRecords(requestUrl: URL, env: Env) {
  if (!env.DB) return dbUnavailable();
  const limit = limitFrom(requestUrl);
  const offset = offsetFrom(requestUrl);
  const source = requestUrl.searchParams.get("source");
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
  if (entityId) { clauses.push("(subject_entity_ids_json LIKE ? OR object_entity_ids_json LIKE ?)"); bindings.push(`%${entityId}%`, `%${entityId}%`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const total = await env.DB.prepare(`SELECT count(*) AS total FROM records ${where}`).bind(...bindings).first<{ total: number }>();
  const rows = await env.DB.prepare(`SELECT * FROM records ${where} ORDER BY occurred_at DESC, id LIMIT ? OFFSET ?`).bind(...bindings, limit, offset).all<JsonRecord>();
  const totalCount = Number(total?.total ?? 0);
  return success((rows.results ?? []).map(record), { total: totalCount, limit, page: Math.floor(offset / limit) + 1, totalPages: Math.max(1, Math.ceil(totalCount / limit)) }, pageLinks(requestUrl, offset, limit, totalCount));
}

async function listRelations(requestUrl: URL, env: Env, crosses = false) {
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

async function listTransferencias(requestUrl: URL, env: Env) {
  const rawPage = Number(requestUrl.searchParams.get("page") ?? 1);
  const rawLimit = Number(requestUrl.searchParams.get("limit") ?? 10);
  const page = Number.isInteger(rawPage) ? Math.max(1, Math.min(rawPage, 10_000)) : 1;
  const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(rawLimit, 100)) : 10;
  const search = (requestUrl.searchParams.get("q") ?? requestUrl.searchParams.get("search") ?? "").trim();
  const year = (requestUrl.searchParams.get("year") ?? "").trim();
  const emisor = (requestUrl.searchParams.get("emisor") ?? "").trim();
  if (search.length > 80 || year.length > 20 || emisor.length > 160) return failure("INVALID_QUERY", "Parámetros de consulta inválidos.", 400);
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

async function exportData(requestUrl: URL, env: Env) {
  const format = requestUrl.searchParams.get("format");
  if (format !== "csv" && format !== "json") return failure("MISSING_PARAMETERS", "Filtros obligatorios: format=csv o format=json.", 400);
  if (requestUrl.searchParams.get("dataset") === "funcionarios") return exportFuncionarios(requestUrl, env, format);
  if (!env.DB) return dbUnavailable();
  const requestedLimit = Number(requestUrl.searchParams.get("limit") ?? 205);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 205) : 205;
  const cargo = (requestUrl.searchParams.get("cargo") ?? "").trim().toLowerCase();
  const rows = await env.DB.prepare("SELECT id, name, kind, attributes_json, source_ids_json FROM entities WHERE kind = ? ORDER BY name, id LIMIT ?").bind("person", 205).all<JsonRecord>();
  const data = (rows.results ?? []).map((row) => {
    const attributes = (parseJson(row.attributes_json) as JsonRecord | null) ?? {};
    return {
      id: row.id,
      nombre_completo: row.name,
      cargo: attributes.cargo ?? attributes.position ?? "",
      partido_sigla: attributes.partido_sigla ?? "IND",
      distrito_region: attributes.distrito_region ?? attributes.region ?? "",
      fuente: attributes.fuente ?? null,
      evidencia_etl: Array.isArray(parseJson(row.source_ids_json)) ? (parseJson(row.source_ids_json) as unknown[]).length : 0,
    };
  }).filter((row) => !cargo || String(row.cargo).toLowerCase().includes(cargo)).slice(0, limit);
  const meta = { version: "v1", snapshot_etl: "worker-d1" };
  if (format === "json") {
    return json({ data, meta }, { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200", "Content-Disposition": "attachment; filename=transparencia_chile.json" } });
  }
  const header = "id,nombre_completo,cargo,partido_sigla,distrito_region,fuente,evidencia_etl";
  const body = data.map((row) => [row.id, row.nombre_completo, row.cargo, row.partido_sigla, row.distrito_region, row.fuente, row.evidencia_etl].map(csvCell).join(",")).join("\n");
  return new Response(`${header}\n${body}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200", "Content-Disposition": "attachment; filename=transparencia_chile.csv", "X-Content-Type-Options": "nosniff" } });
}

async function exportFuncionarios(requestUrl: URL, env: Env, format: "csv" | "json") {
  const limitValue = Number(requestUrl.searchParams.get("limit") ?? 100);
  const limit = Number.isInteger(limitValue) ? Math.min(Math.max(limitValue, 1), 500) : 100;
  const pageValue = Number(requestUrl.searchParams.get("page") ?? 1);
  const page = Number.isInteger(pageValue) ? Math.max(1, Math.min(pageValue, 100_000)) : 1;
  const sourceUrl = new URL(requestUrl);
  sourceUrl.searchParams.set("page", String(page));
  sourceUrl.searchParams.set("limit", String(limit));
  const response = await (await listFuncionariosFromD1(sourceUrl, env)) ?? await listFuncionariosFromR2(sourceUrl, env);
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
  if (!env.DB) return dbUnavailable();
  try {
    const rows = await env.DB.prepare(`
      SELECT
        sources.*,
        COALESCE((SELECT COUNT(*) FROM records WHERE records.source_id = sources.id), 0) AS materialized_count,
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
      const materializedCount = Number(row.materialized_count ?? 0);
      const stateCount = Number(row.state_record_count ?? 0);
      const stateStatus = String(row.state_status ?? "");
      const projectionOnly = row.id === "personal-apoyo";
      const archiveOnly = stateStatus === "archive_only";
      const recordCount = archiveOnly || projectionOnly ? Math.max(materializedCount, stateCount) : materializedCount;
      const status = archiveOnly ? "partial" : recordCount > 0 ? "connected" : "unavailable";
      return {
        ...row,
        materialized_count: undefined,
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
    const rows = await env.DB.prepare("SELECT * FROM sources ORDER BY id").all<JsonRecord>();
    return success((rows.results ?? []).map((row) => ({ ...row, recordCount: 0, status: "unavailable" })), { total: rows.results?.length ?? 0 }, { self: requestUrl.toString() });
  }
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
  if (!new Set(["rectificacion", "cancelacion", "oposicion", "acceso", "informacion", "otro"]).has(tipo)) return failure("INVALID_TYPE", "Tipo de solicitud no válido.", 400);
  if (!/^[^@\s]{1,120}@[^@\s]{1,120}\.[A-Za-z]{2,}$/.test(email)) return failure("INVALID_EMAIL", "Correo electrónico no válido.", 400);
  if (descripcion.length < 10 || descripcion.length > 4000) return failure("INVALID_DESCRIPTION", "La descripción debe tener entre 10 y 4000 caracteres.", 400);
  if (body.website) return failure("SPAM_DETECTED", "Solicitud rechazada.", 400);
  const result = await env.DB.prepare("INSERT INTO data_requests (tipo, nombre, email, descripcion, ip_hash, estado) VALUES (?, ?, ?, ?, ?, 'recibida')").bind(tipo, String(body.nombre ?? "").slice(0, 120), email, descripcion, "worker").run();
  return json({ data: { id: result.meta?.last_row_id ?? null, estado: "recibida" } }, { status: 201, headers: { "Cache-Control": "no-store" } });
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
      return limited ?? search(url, env);
    }
    if (path === "/api/v1/transferencias") return listTransferencias(url, env);
    if (path === "/api/directorio" || path === "/api/v1/entities") return listEntities(url, env);
    if (path === "/api/v1/records") return listRecords(url, env);
    if (path === "/api/v1/relations") return listRelations(url, env);
    if (path === "/api/v1/crosses") return listRelations(url, env, true);
    if (path === "/api/v1/alertas") return success([]);
    if (path === "/api/v1/commercial/keys") return failure("COMMERCIAL_API_UNAVAILABLE", "La API comercial no está disponible.", 503);
    if (path === "/api/v1/health") return health(env);
    if (path === "/api/v1/health/data") {
      return health(env);
    }
    if (path === "/api/v1/sources") {
      return listSources(url, env);
    }
    if (path === "/api/v1/export") {
        const limited = await rateLimit(request, env, "export");
        return limited ?? exportData(url, env);
      }
    if (path === "/api/funcionarios" || path === "/api/v1/funcionarios") {
      const invalid = validateOfficials(url);
      if (invalid) return failure("INVALID_QUERY", invalid, 400);
      const d1 = await listFuncionariosFromD1(url, env);
      return d1 ?? listFuncionariosFromR2(url, env);
    }
    if (path.startsWith("/api/v1/politico/")) {
      if (!env.DB) return dbUnavailable();
      const id = decodeURIComponent(path.split("/").at(-1) ?? "");
      let row = await env.DB.prepare("SELECT * FROM politicos WHERE id = ? LIMIT 1").bind(id).first<JsonRecord>();
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
    }
    if (path.startsWith("/api/v1/entities/")) {
      if (!env.DB) return dbUnavailable();
      const id = decodeURIComponent(path.split("/").at(-1) ?? "");
      const row = await env.DB.prepare("SELECT * FROM entities WHERE id = ? LIMIT 1").bind(id).first<JsonRecord>();
      return row ? success(entity(row), { id }, { self: url.toString() }) : failure("NOT_FOUND", "Entidad no encontrada.", 404, { id });
    }
    return failure("NOT_FOUND", "Ruta no encontrada.", 404);
  },
};
