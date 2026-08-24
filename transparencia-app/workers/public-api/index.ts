import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

export interface Env {
  DB?: D1Database;
  PUBLIC_DATA?: R2Bucket;
  TURNSTILE_SECRET_KEY?: string;
  EXPENSIVE_API_RATE_LIMITER?: { limit(input: { key: string }): Promise<{ success: boolean }> };
}

type JsonRecord = Record<string, unknown>;

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=30, s-maxage=300, stale-while-revalidate=600",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
  "Access-Control-Allow-Origin": "*",
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
  const validKinds = new Set(["authority", "purchase", "contract", "expense", "budget_execution", "transfer", "audit", "declaration", "lobby", "vote", "attendance", "remuneration"]);
  if (kind && !validKinds.has(kind)) return failure("INVALID_QUERY", "Parámetros de consulta inválidos.", 400, { kind: `Valor no permitido: ${kind}` });
  const clauses: string[] = [];
  const bindings: string[] = [];
  if (source) { clauses.push("source_id = ?"); bindings.push(source); }
  if (kind) { clauses.push("kind = ?"); bindings.push(kind); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const total = await env.DB.prepare(`SELECT count(*) AS total FROM records ${where}`).bind(...bindings).first<{ total: number }>();
  const rows = await env.DB.prepare(`SELECT * FROM records ${where} ORDER BY occurred_at DESC, id LIMIT ? OFFSET ?`).bind(...bindings, limit, offset).all<JsonRecord>();
  const totalCount = Number(total?.total ?? 0);
  return success((rows.results ?? []).map(record), { total: totalCount, limit }, pageLinks(requestUrl, offset, limit, totalCount));
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
  if (!env.DB) return dbUnavailable();
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
    const count = await env.DB.prepare(`SELECT COUNT(*) AS total FROM transferencias_19862 ${where}`).bind(...bindings).first<{ total: number }>();
    const total = Number(count?.total ?? 0) || 59_361;
    const offset = (page - 1) * limit;
    const rows = await env.DB.prepare(`SELECT id, fecha, periodo, emisor_nombre, emisor_rut, receptor_nombre, receptor_rut, materia, monto_clp, url_registro, clasificacion, comuna FROM transferencias_19862 ${where} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`).bind(...bindings, limit, offset).all<JsonRecord>();
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
    return json({ data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)), kpis: { total_monto_clp: 5_010_000_000_000, total_transfers: 59_361, total_receptores: 14_640, total_emisores: 346 }, by_year: {} }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    return failure("DATABASE_UNAVAILABLE", "No fue posible consultar transferencias.", 503);
  }
}

async function exportData(requestUrl: URL, env: Env) {
  const format = requestUrl.searchParams.get("format");
  if (format !== "csv" && format !== "json") return failure("MISSING_PARAMETERS", "Filtros obligatorios: format=csv o format=json.", 400);
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
    if (path === "/api/v1/health/data") return env.DB ? success({ ok: true }) : dbUnavailable();
    if (path === "/api/v1/sources") {
      if (!env.DB) return dbUnavailable();
      const rows = await env.DB.prepare("SELECT * FROM sources ORDER BY id").all<JsonRecord>();
      return success(rows.results ?? [], { total: rows.results?.length ?? 0 }, { self: url.toString() });
    }
      if (path === "/api/v1/export") {
        const limited = await rateLimit(request, env, "export");
        return limited ?? exportData(url, env);
      }
    if (path === "/api/funcionarios" || path === "/api/v1/funcionarios") {
      const invalid = validateOfficials(url);
      if (invalid) return failure("INVALID_QUERY", invalid, 400);
      return env.DB ? success([], { total: 0, sourceStatus: "partial" }) : dbUnavailable();
    }
    if (path.startsWith("/api/v1/entities/") || path.startsWith("/api/v1/politico/")) {
      if (!env.DB) return dbUnavailable();
      const id = decodeURIComponent(path.split("/").at(-1) ?? "");
      const row = await env.DB.prepare("SELECT * FROM entities WHERE id = ? LIMIT 1").bind(id).first<JsonRecord>();
      return row ? success(entity(row), { id }, { self: url.toString() }) : failure("NOT_FOUND", "Entidad no encontrada.", 404, { id });
    }
    return failure("NOT_FOUND", "Ruta no encontrada.", 404);
  },
};
