export interface Env {
  DB?: D1Database;
  PUBLIC_DATA?: R2Bucket;
  EXPENSIVE_API_RATE_LIMITER?: RateLimit;
  TURNSTILE_SECRET?: string;
}

type EntityRow = {
  id: string;
  kind: string;
  name: string;
  identifiers_json: string;
  attributes_json: string;
  source_ids_json: string;
  updated_at: string | null;
};

type OfficialRow = {
  id: string;
  nombre_completo: string;
  cargo: string;
  organo_id: string;
  estamento: string;
  tipo_contrato: string;
  remuneracion_bruta_mensual: number;
};

type OfficialR2Record = OfficialRow & {
  remuneracion_liquida_mensual?: number;
  fecha_ingreso?: string | null;
  fecha_termino?: string | null;
  horas_extras_mes_anterior?: number;
  monto_horas_extras_clp?: number;
  formacion?: string | null;
  fuente_periodo?: string | null;
  periodo?: string | null;
  observaciones?: string | null;
  [key: string]: unknown;
};

type OfficialsR2Manifest = {
  version: string;
  generatedAt: string;
  assets?: Array<{ key: string }>;
  coverage?: Array<{ communeId: string; administrationId: string; status: string }>;
};

type TransferRow = {
  id: string;
  folio: string | null;
  fecha: string;
  periodo: string;
  emisor_nombre: string;
  emisor_rut: string | null;
  receptor_nombre: string;
  receptor_rut: string | null;
  materia: string;
  monto_clp: number;
  url_registro: string;
  clasificacion: string | null;
  comuna: string | null;
};

type CanonicalRecordRow = {
  id: string;
  kind: string;
  source_id: string;
  title: string;
  description: string | null;
  occurred_at: string | null;
  period_json: string;
  subject_entity_ids_json: string;
  object_entity_ids_json: string;
  amount_json: string | null;
  evidence_json: string;
  data_json: string;
};

type CanonicalRelationRow = {
  id: string;
  from_id: string;
  predicate: string;
  to_id: string;
  evidence_record_ids_json: string;
  period_json: string;
  reconciliation_json: string;
  disclaimer: string;
  source_id: string | null;
};

type CanonicalSourceRow = {
  id: string;
  label: string;
  organization: string | null;
  official_url: string | null;
  license: string | null;
  expected_coverage: string | null;
  status: string | null;
  record_count: number | null;
  checksum_sha256: string | null;
  generated_at: string | null;
  last_success_at: string | null;
  error: string | null;
  published_version: string | null;
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  try {
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function offsetFromCursor(value: string | null) {
  if (!value) return 0;
  const match = /^v1_([0-9a-z]+)$/.exec(value);
  if (!match) return -1;
  const offset = Number.parseInt(match[1], 36);
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : -1;
}

function pageResponse(request: Request, data: unknown[], total: number, limit: number, offset: number, meta: Record<string, unknown> = {}) {
  const nextOffset = offset + data.length;
  const next = nextOffset < total ? new URL(request.url) : null;
  if (next) next.searchParams.set("cursor", `v1_${nextOffset.toString(36)}`);
  return response({
    data,
    meta: { version: "v1", sourceStatus: "available", stale: false, total, limit, ...meta },
    links: { self: request.url, next: next?.toString() ?? null },
  }, 200, 300);
}

function canonicalRecord(row: CanonicalRecordRow) {
  return {
    id: row.id,
    kind: row.kind,
    sourceId: row.source_id,
    title: row.title,
    description: row.description,
    occurredAt: row.occurred_at,
    period: parseJson(row.period_json, {}),
    subjectEntityIds: parseJson(row.subject_entity_ids_json, []),
    objectEntityIds: parseJson(row.object_entity_ids_json, []),
    amount: parseJson(row.amount_json, null),
    evidence: parseJson(row.evidence_json, {}),
    data: parseJson(row.data_json, {}),
  };
}

function canonicalRelation(row: CanonicalRelationRow) {
  return {
    id: row.id,
    fromId: row.from_id,
    predicate: row.predicate,
    toId: row.to_id,
    evidenceRecordIds: parseJson(row.evidence_record_ids_json, []),
    period: parseJson(row.period_json, {}),
    reconciliation: parseJson(row.reconciliation_json, {}),
    disclaimer: row.disclaimer,
  };
}

const jsonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Cambiometro-Uptime-Token",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function response(data: unknown, status = 200, cache = 300, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...jsonHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache === 0 ? "no-store" : `public, max-age=${cache}, stale-while-revalidate=${cache * 12}`,
      ...extra,
    },
  });
}

function success(request: Request, data: unknown, meta: Record<string, unknown> = {}, cache = 300) {
  return response({
    data,
    meta: { version: "v1", sourceStatus: "available", stale: false, ...meta },
    links: { self: request.url },
  }, 200, cache);
}

function error(code: string, message: string, status: number, details?: unknown) {
  return response({ error: { code, message, ...(details === undefined ? {} : { details }) } }, status, 0);
}

function normalized(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");
}

function positive(value: string | null, fallback: number, maximum: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

async function limited(request: Request, env: Env, key: string) {
  if (!env.EXPENSIVE_API_RATE_LIMITER) return false;
  const ip = request.headers.get("CF-Connecting-IP") ?? "anonymous";
  const result = await env.EXPENSIVE_API_RATE_LIMITER.limit({ key: `${key}:${ip}` });
  return !result.success;
}

async function health(request: Request, env: Env) {
  if (!env.DB) return response({ status: "unavailable", code: "DATABASE_UNAVAILABLE" }, 503, 0);
  try {
    const result = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
    return success(request, { status: result?.ok === 1 ? "healthy" : "degraded" }, { bindings: { d1: true, r2: Boolean(env.PUBLIC_DATA) } }, 30);
  } catch {
    return response({ status: "unavailable", code: "DATABASE_UNAVAILABLE" }, 503, 0);
  }
}

async function search(request: Request, env: Env) {
  if (await limited(request, env, "search")) return error("RATE_LIMITED", "Demasiadas consultas.", 429);
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (query.length < 2 || query.length > 80) return error("INVALID_QUERY", "La consulta debe tener entre 2 y 80 caracteres.", 400);
  if (!env.DB) return error("DATABASE_UNAVAILABLE", "D1 no está disponible.", 503);
  const term = `%${query.replace(/[\\%_]/g, "\\$&").toLocaleLowerCase("es-CL")}%`;
  const grouped = { autoridades: [] as unknown[], municipalidades: [] as unknown[], funcionarios: [] as unknown[], entidades: [] as unknown[] };
  let availableSources = 0;

  try {
    const rows = await env.DB.prepare(
      `SELECT id,kind,name,identifiers_json,attributes_json,source_ids_json,updated_at
       FROM entities WHERE lower(name) LIKE ? ESCAPE '\\' ORDER BY name LIMIT 100`,
    ).bind(term).all<EntityRow>();
    availableSources += 1;
    for (const row of rows.results ?? []) {
      const item = { type: row.kind, id: row.id, nombre: row.name, cargo: row.kind, url: `/entidades/${row.id}` };
      if (row.kind === "person") grouped.autoridades.push({ ...item, type: "politico", url: `/politico/${row.id}` });
      else if (row.kind === "municipality") grouped.municipalidades.push({ ...item, type: "municipalidad" });
      else if (row.kind === "official") grouped.funcionarios.push({ ...item, type: "funcionario", url: "/funcionarios" });
      else grouped.entidades.push({ ...item, type: "entidad" });
    }
  } catch {
    // Las tablas de la plataforma canónica pueden publicarse por etapas.
    // No ocultamos los resultados de funcionarios si esa tabla sí está lista.
  }

  try {
    const officials = await env.DB.prepare(
      `SELECT id,nombre_completo,cargo,organo_id,estamento,tipo_contrato,remuneracion_bruta_mensual
       FROM funcionarios_publicos
       WHERE lower(nombre_completo) LIKE ? ESCAPE '\\' OR lower(cargo) LIKE ? ESCAPE '\\'
       ORDER BY nombre_completo LIMIT 25`,
    ).bind(term, term).all<OfficialRow>();
    availableSources += 1;
    for (const row of officials.results ?? []) {
      grouped.funcionarios.push({
        type: "funcionario",
        id: row.id,
        nombre: row.nombre_completo,
        organo: row.organo_id,
        cargo: row.cargo,
        estamento: row.estamento,
        tipo_contrato: row.tipo_contrato,
        remuneracion_bruta: row.remuneracion_bruta_mensual,
        url: "/funcionarios",
      });
    }
  } catch {
    // Ver abajo: si ninguna fuente está disponible, la respuesta sí es 503.
  }

  if (availableSources === 0) return error("DATABASE_UNAVAILABLE", "No fue posible consultar los índices de búsqueda.", 503);
  const returned = Object.values(grouped).reduce((sum, items) => sum + items.length, 0);
  return success(request, grouped, { query, engine: "D1 indexed entity and official search", total: returned, returned, truncated: false }, 3600);
}

function transferData(row: TransferRow) {
  return {
    id: row.id,
    fecha: row.fecha,
    period: row.periodo,
    title: row.materia,
    description: null,
    classification: row.clasificacion,
    emitter_name: row.emisor_nombre,
    emitter_rut: row.emisor_rut,
    receiver_name: row.receptor_nombre,
    receiver_rut: row.receptor_rut,
    monto_clp: row.monto_clp,
    url: row.url_registro,
    municipality: row.comuna,
  };
}

async function transferencias(request: Request, env: Env) {
  if (await limited(request, env, "transferencias")) return error("RATE_LIMITED", "Demasiadas consultas.", 429);
  if (!env.DB) return error("DATABASE_UNAVAILABLE", "D1 no está disponible.", 503);
  const url = new URL(request.url);
  const page = positive(url.searchParams.get("page"), 1, 100000);
  const limit = positive(url.searchParams.get("limit") ?? url.searchParams.get("pageSize"), 50, 100);
  const searchValue = (url.searchParams.get("q") ?? url.searchParams.get("search") ?? "").trim();
  const year = (url.searchParams.get("year") ?? "").trim();
  const emisor = (url.searchParams.get("emisor") ?? "").trim();
  const sort = url.searchParams.get("sort") === "fecha" ? "fecha" : "monto_clp";
  const direction = url.searchParams.get("order") === "asc" ? "ASC" : "DESC";
  const conditions: string[] = [];
  const bindings: Array<string | number> = [];
  if (year && year !== "Todos") { conditions.push("periodo = ?"); bindings.push(year); }
  if (emisor && emisor !== "Todos") { conditions.push("emisor_nombre = ?"); bindings.push(emisor); }
  if (searchValue) {
    conditions.push("(lower(emisor_nombre) LIKE ? OR lower(receptor_nombre) LIKE ? OR lower(materia) LIKE ? OR lower(emisor_rut) LIKE ? OR lower(receptor_rut) LIKE ? OR lower(comuna) LIKE ?)");
    const term = `%${normalized(searchValue)}%`;
    bindings.push(term, term, term, term, term, term);
  }
  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * limit;
  try {
    const available = await env.DB.prepare("SELECT 1 AS ok FROM transferencias_19862 LIMIT 1").first<{ ok: number }>();
    if (!available) return error("DATASET_UNAVAILABLE", "La proyección completa de transferencias todavía no está publicada en D1.", 503);
    const count = await env.DB.prepare(`SELECT COUNT(*) AS total FROM transferencias_19862${where}`).bind(...bindings).first<{ total: number }>();
    const total = Number(count?.total ?? 0);
    const result = await env.DB.prepare(
      `SELECT id,folio,fecha,periodo,emisor_nombre,emisor_rut,receptor_nombre,receptor_rut,materia,monto_clp,url_registro,clasificacion,comuna
       FROM transferencias_19862${where} ORDER BY ${sort} ${direction} LIMIT ? OFFSET ?`,
    ).bind(...bindings, limit, offset).all<TransferRow>();
    const data = (result.results ?? []).map(transferData);
    return response({ data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)), sourceStatus: "complete" }, 200, 3600);
  } catch {
    return error("DATASET_UNAVAILABLE", "La proyección completa de transferencias todavía no está publicada en D1.", 503);
  }
}

async function funcionarios(request: Request, env: Env) {
  if (await limited(request, env, "funcionarios")) return error("RATE_LIMITED", "Demasiadas consultas.", 429);
  const url = new URL(request.url);
  const query = normalized(url.searchParams.get("query"));
  const limit = positive(url.searchParams.get("limit"), 20, 100);
  const page = positive(url.searchParams.get("page"), 1, 1000);
  const organismo = url.searchParams.get("muni") ?? url.searchParams.get("organismo") ?? "Todos";
  const contrato = url.searchParams.get("contrato") ?? "Todos";
  const estamento = url.searchParams.get("estamento") ?? "Todos";
  const periodo = url.searchParams.get("periodo") ?? url.searchParams.get("fuente_periodo") ?? "Todos";
  const sortBy = url.searchParams.get("sortBy") ?? "sueldo_desc";
  const term = `%${query.replace(/[\\%_]/g, "\\$&")}%`;

  // Las fichas municipales necesitan período y cobertura exactos. R2 es la
  // proyección autoritativa para ese contrato; D1 no conserva esos campos en
  // su esquema histórico, por lo que no debe ganar por accidente.
  if (organismo !== "Todos" && env.PUBLIC_DATA) {
    const r2Response = await officialsFromR2(request, env, { query, organismo, contrato, estamento, periodo, sortBy, page, limit });
    if (r2Response.status !== 503) return r2Response;
  }

  try {
    if (!env.DB) throw new Error("D1_NOT_BOUND");
    const conditions: string[] = [];
    const params: Array<string | number> = [];
    if (organismo !== "Todos") { conditions.push("organo_id = ?"); params.push(organismo); }
    if (contrato !== "Todos") { conditions.push("tipo_contrato = ?"); params.push(contrato); }
    if (estamento !== "Todos") { conditions.push("estamento = ?"); params.push(estamento); }
    if (query) { conditions.push("(lower(nombre_completo) LIKE ? ESCAPE '\\' OR lower(cargo) LIKE ? ESCAPE '\\')"); params.push(term, term); }
    const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
    const order = sortBy === "sueldo_asc" ? "ASC" : sortBy === "nombre_asc" ? "ASC" : "DESC";
    const orderColumn = sortBy === "nombre_asc" ? "nombre_completo" : "remuneracion_bruta_mensual";
    const count = await env.DB.prepare(`SELECT COUNT(*) AS total FROM funcionarios_publicos${where}`).bind(...params).first<{ total: number }>();
    const rows = await env.DB.prepare(`SELECT id,nombre_completo,cargo,estamento,tipo_contrato,remuneracion_bruta_mensual,organo_id FROM funcionarios_publicos${where} ORDER BY ${orderColumn} ${order} LIMIT ? OFFSET ?`).bind(...params, limit, (page - 1) * limit).all();
    const total = Number(count?.total ?? 0);
    return success(request, rows.results ?? [], { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)), sourceStatus: periodo !== "Todos" ? "partial" : "available", stale: periodo !== "Todos" }, 300);
  } catch {
    return officialsFromR2(request, env, { query, organismo, contrato, estamento, periodo, sortBy, page, limit });
  }
}

async function officialsFromR2(
  request: Request,
  env: Env,
  filters: { query: string; organismo: string; contrato: string; estamento: string; periodo: string; sortBy: string; page: number; limit: number },
) {
  if (!env.PUBLIC_DATA || filters.organismo === "Todos") {
    return error("DATASET_UNAVAILABLE", "El directorio de funcionarios no está disponible.", 503);
  }

  try {
    const manifestObject = await env.PUBLIC_DATA.get("projections/funcionarios-v1/manifest.json");
    if (!manifestObject) throw new Error("CPLT_MANIFEST_NOT_FOUND");
    const manifest = await manifestObject.json<OfficialsR2Manifest>();
    const coverage = manifest.coverage?.find((item) => item.communeId === filters.organismo);
    if (coverage?.status === "unavailable") throw new Error("CPLT_MUNICIPALITY_UNAVAILABLE");
    const key = `projections/funcionarios-v1/versions/${manifest.version}/${filters.organismo}.json`;
    if (manifest.assets && !manifest.assets.some((asset) => asset.key === key)) throw new Error("CPLT_PARTITION_NOT_LISTED");
    const object = await env.PUBLIC_DATA.get(key);
    if (!object) throw new Error("CPLT_PARTITION_NOT_FOUND");
    const raw = await object.json<OfficialR2Record[]>();
    const periodRows = filters.periodo !== "Todos"
      ? raw.filter((row) => (row.fuente_periodo ?? row.periodo ?? "") === filters.periodo)
      : raw;
    const sinPagoCount = periodRows.filter((row) => Number(row.remuneracion_bruta_mensual ?? 0) <= 0).length;
    const microMontoCount = periodRows.filter((row) => {
      const amount = Number(row.remuneracion_bruta_mensual ?? 0);
      return amount > 0 && amount < 50_000;
    }).length;
    const includeZero = new URL(request.url).searchParams.get("include_zero") === "true";
    let filtered = includeZero ? [...periodRows] : periodRows.filter((row) => Number(row.remuneracion_bruta_mensual ?? 0) > 0);
    if (filters.query) {
      filtered = filtered.filter((row) => [row.nombre_completo, row.cargo, row.formacion]
        .filter(Boolean)
        .some((value) => normalized(value).includes(filters.query)));
    }
    if (filters.contrato !== "Todos") filtered = filtered.filter((row) => normalized(row.tipo_contrato).includes(normalized(filters.contrato)));
    if (filters.estamento !== "Todos") filtered = filtered.filter((row) => normalized(row.estamento).includes(normalized(filters.estamento)));
    filtered.sort((left, right) => {
      if (filters.sortBy === "nombre_asc") return normalized(left.nombre_completo).localeCompare(normalized(right.nombre_completo));
      if (filters.sortBy === "horas_extras_desc") return Number(right.horas_extras_mes_anterior ?? 0) - Number(left.horas_extras_mes_anterior ?? 0);
      if (filters.sortBy === "sueldo_asc") return Number(left.remuneracion_bruta_mensual ?? 0) - Number(right.remuneracion_bruta_mensual ?? 0);
      return Number(right.remuneracion_bruta_mensual ?? 0) - Number(left.remuneracion_bruta_mensual ?? 0);
    });
    const total = filtered.length;
    const data = filtered.slice((filters.page - 1) * filters.limit, filters.page * filters.limit);
    const validCount = periodRows.filter((row) => Number(row.remuneracion_bruta_mensual ?? 0) >= 50_000).length;
    return success(request, data, {
      total,
      totalHeadcount: periodRows.length,
      sinPagoCount,
      microMontoCount,
      sueldoCompletoCount: validCount,
      observadosCount: sinPagoCount + microMontoCount,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
      updatedAt: manifest.generatedAt,
      communeId: filters.organismo,
      sourceStatus: "available",
      stale: false,
      stats: {
        totalMuni: periodRows.length,
        totalValidos: validCount,
        observadosCount: sinPagoCount + microMontoCount,
        sinPagoCount,
        microMontoCount,
      },
    }, 3600);
  } catch {
    return error("DATASET_UNAVAILABLE", "El directorio de funcionarios no está disponible.", 503);
  }
}

async function sources(request: Request, env: Env) {
  if (!env.DB) return error("DATABASE_UNAVAILABLE", "D1 no está disponible.", 503);
  try {
    const result = await env.DB.prepare(
      `SELECT s.id,s.label,s.organization,s.official_url,s.license,s.expected_coverage,
              ss.status,ss.record_count,ss.checksum_sha256,ss.generated_at,
              ss.last_success_at,ss.error,ss.published_version
       FROM sources s LEFT JOIN source_state ss ON ss.source_id=s.id ORDER BY s.id`,
    ).all<CanonicalSourceRow>();
    const data = (result.results ?? []).map((row) => {
      const count = Number(row.record_count ?? 0);
      const status = row.status === "archive_only" ? "partial" : row.status ?? (count > 0 ? "connected" : "unavailable");
      return {
        id: row.id,
        label: row.label,
        organization: row.organization,
        url: row.official_url,
        license: row.license,
        expectedCoverage: row.expected_coverage,
        foundPeriods: [],
        lastUpdated: row.last_success_at ?? row.generated_at,
        checksumSha256: row.checksum_sha256,
        recordCount: count,
        errorCount: row.error ? 1 : 0,
        status,
        statusDetail: row.error ?? (status === "unavailable" ? "Sin release publicado." : "Release publicado."),
        storageTier: status === "partial" ? "r2" : "d1",
        publishedVersion: row.published_version,
      };
    });
    const statuses = Object.fromEntries(["connected", "partial", "stale", "unavailable"].map((status) => [status, data.filter((item) => item.status === status).length]));
    return success(request, data, { total: data.length, statuses }, 3600);
  } catch {
    return error("DATABASE_UNAVAILABLE", "No fue posible consultar las fuentes publicadas.", 503);
  }
}

async function records(request: Request, env: Env) {
  if (await limited(request, env, "records")) return error("RATE_LIMITED", "Demasiadas consultas.", 429);
  if (!env.DB) return error("DATABASE_UNAVAILABLE", "D1 no está disponible.", 503);
  const params = new URL(request.url).searchParams;
  const limit = positive(params.get("limit"), 20, 100);
  const offset = offsetFromCursor(params.get("cursor"));
  if (offset < 0) return error("INVALID_QUERY", "Cursor inválido.", 400, { cursor: "Use un cursor v1_." });
  const conditions: string[] = [];
  const bindings: Array<string | number> = [];
  const entityId = params.get("entity_id");
  const kind = params.get("kind");
  const source = params.get("source");
  const from = params.get("from");
  const to = params.get("to");
  if (entityId) {
    conditions.push("(EXISTS (SELECT 1 FROM record_subjects rs WHERE rs.record_id=records.id AND rs.entity_id=?) OR EXISTS (SELECT 1 FROM record_objects ro WHERE ro.record_id=records.id AND ro.entity_id=?))");
    bindings.push(entityId, entityId);
  }
  if (kind) { conditions.push("kind=?"); bindings.push(kind); }
  if (source) { conditions.push("source_id=?"); bindings.push(source); }
  if (from) { conditions.push("occurred_at>=?"); bindings.push(from); }
  if (to) { conditions.push("occurred_at<=?"); bindings.push(to); }
  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  try {
    const count = await env.DB.prepare(`SELECT COUNT(*) AS total FROM records${where}`).bind(...bindings).first<{ total: number }>();
    const result = await env.DB.prepare(
      `SELECT id,kind,source_id,title,description,occurred_at,period_json,subject_entity_ids_json,
              object_entity_ids_json,amount_json,evidence_json,data_json
       FROM records${where} ORDER BY occurred_at DESC,id LIMIT ? OFFSET ?`,
    ).bind(...bindings, limit, offset).all<CanonicalRecordRow>();
    const data = (result.results ?? []).map(canonicalRecord);
    return pageResponse(request, data, Number(count?.total ?? 0), limit, offset);
  } catch {
    return error("DATABASE_UNAVAILABLE", "La proyección de registros no está disponible.", 503);
  }
}

async function relations(request: Request, env: Env) {
  if (await limited(request, env, "relations")) return error("RATE_LIMITED", "Demasiadas consultas.", 429);
  if (!env.DB) return error("DATABASE_UNAVAILABLE", "D1 no está disponible.", 503);
  const params = new URL(request.url).searchParams;
  const limit = positive(params.get("limit"), 20, 100);
  const offset = offsetFromCursor(params.get("cursor"));
  if (offset < 0) return error("INVALID_QUERY", "Cursor inválido.", 400, { cursor: "Use un cursor v1_." });
  const conditions: string[] = [];
  const bindings: string[] = [];
  const entityId = params.get("entity_id");
  const fromId = params.get("from_id");
  const toId = params.get("to_id");
  const predicate = params.get("predicate");
  if (entityId) { conditions.push("(from_id=? OR to_id=?)"); bindings.push(entityId, entityId); }
  if (fromId) { conditions.push("from_id=?"); bindings.push(fromId); }
  if (toId) { conditions.push("to_id=?"); bindings.push(toId); }
  if (predicate) { conditions.push("predicate=?"); bindings.push(predicate); }
  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  try {
    const count = await env.DB.prepare(`SELECT COUNT(*) AS total FROM relations${where}`).bind(...bindings).first<{ total: number }>();
    const result = await env.DB.prepare(
      `SELECT id,from_id,predicate,to_id,evidence_record_ids_json,period_json,reconciliation_json,disclaimer,source_id
       FROM relations${where} ORDER BY id LIMIT ? OFFSET ?`,
    ).bind(...bindings, limit, offset).all<CanonicalRelationRow>();
    return pageResponse(request, (result.results ?? []).map(canonicalRelation), Number(count?.total ?? 0), limit, offset);
  } catch {
    return error("DATABASE_UNAVAILABLE", "La proyección de relaciones no está disponible.", 503);
  }
}

async function crosses(request: Request, env: Env) {
  if (await limited(request, env, "crosses")) return error("RATE_LIMITED", "Demasiadas consultas.", 429);
  if (!env.DB) return error("DATABASE_UNAVAILABLE", "D1 no está disponible.", 503);
  const params = new URL(request.url).searchParams;
  const limit = positive(params.get("limit"), 20, 100);
  const offset = offsetFromCursor(params.get("cursor"));
  if (offset < 0) return error("INVALID_QUERY", "Cursor inválido.", 400, { cursor: "Use un cursor v1_." });
  const entityId = params.get("entity_id") ?? params.get("counterparty_id");
  if (!entityId) return error("INVALID_QUERY", "Debe proporcionar entity_id o counterparty_id.", 400);
  try {
    const relationRows = await env.DB.prepare(
      `SELECT id,from_id,predicate,to_id,evidence_record_ids_json,period_json,reconciliation_json,disclaimer,source_id
       FROM relations WHERE from_id=? OR to_id=? ORDER BY id LIMIT ? OFFSET ?`,
    ).bind(entityId, entityId, limit, offset).all<CanonicalRelationRow>();
    const selected = (relationRows.results ?? []).map(canonicalRelation);
    const relationCount = await env.DB.prepare("SELECT COUNT(*) AS total FROM relations WHERE from_id=? OR to_id=?").bind(entityId, entityId).first<{ total: number }>();
    const relationIds = [...new Set(selected.flatMap((row) => [row.fromId, row.toId]))];
    const recordIds = [...new Set(selected.flatMap((row) => row.evidenceRecordIds))];
    const entities = relationIds.length
      ? (await env.DB.prepare(`SELECT id,kind,name,identifiers_json,attributes_json,source_ids_json,updated_at FROM entities WHERE id IN (${relationIds.map(() => "?").join(",")})`).bind(...relationIds).all<EntityRow>()).results ?? []
      : [];
    const recordsRows = recordIds.length
      ? (await env.DB.prepare(`SELECT id,kind,source_id,title,description,occurred_at,period_json,subject_entity_ids_json,object_entity_ids_json,amount_json,evidence_json,data_json FROM records WHERE id IN (${recordIds.map(() => "?").join(",")})`).bind(...recordIds).all<CanonicalRecordRow>()).results ?? []
      : [];
    const entityMap = new Map(entities.map((row) => [row.id, {
      id: row.id, kind: row.kind, name: row.name,
      identifiers: parseJson(row.identifiers_json, []), attributes: parseJson(row.attributes_json, {}),
      sourceIds: parseJson(row.source_ids_json, []), updatedAt: row.updated_at,
    }]));
    const recordMap = new Map(recordsRows.map((row) => [row.id, canonicalRecord(row)]));
    const data = selected.flatMap((relation) => {
      const fromEntity = entityMap.get(relation.fromId);
      const toEntity = entityMap.get(relation.toId);
      const evidence = relation.evidenceRecordIds.map((id) => recordMap.get(id)).filter(Boolean);
      return fromEntity && toEntity && evidence.length > 0 ? [{ relation, fromEntity, toEntity, evidence }] : [];
    });
    return pageResponse(request, data, Number(relationCount?.total ?? 0), limit, offset, {
      disclaimer: "Una relación documental no implica irregularidad ni responsabilidad.",
    });
  } catch {
    return error("DATABASE_UNAVAILABLE", "La proyección de cruces no está disponible.", 503);
  }
}

async function entity(request: Request, env: Env, id: string) {
  if (!env.DB) return error("DATABASE_UNAVAILABLE", "D1 no está disponible.", 503);
  try {
    const row = await env.DB.prepare("SELECT id,kind,name,identifiers_json,attributes_json,source_ids_json,updated_at FROM entities WHERE id = ?").bind(id).first<EntityRow>();
    if (!row) return error("NOT_FOUND", "Entidad no encontrada.", 404);
    return success(request, { id: row.id, kind: row.kind, name: row.name, identifiers: JSON.parse(row.identifiers_json), attributes: JSON.parse(row.attributes_json), sourceIds: JSON.parse(row.source_ids_json), updatedAt: row.updated_at }, {}, 3600);
  } catch {
    return error("DATABASE_UNAVAILABLE", "No fue posible consultar la entidad.", 503);
  }
}

async function dataHealth(request: Request, env: Env) {
  if (!env.DB) return response({ data: { status: "unavailable", latestRun: null, sources: [] }, meta: { version: "v1", checkedAt: new Date().toISOString(), reason: "DATABASE_UNAVAILABLE" }, links: { self: request.url } }, 503, 0);
  try {
    const [states, counts, latest] = await Promise.all([
      env.DB.prepare("SELECT source_id,status,record_count,generated_at,last_success_at,error,published_version FROM source_state ORDER BY source_id").all<Record<string, unknown>>(),
      env.DB.prepare("SELECT source_id,COUNT(*) AS count FROM records GROUP BY source_id ORDER BY source_id").all<{ source_id: string; count: number }>(),
      env.DB.prepare("SELECT id,status,started_at,finished_at FROM etl_runs ORDER BY started_at DESC LIMIT 1").first<Record<string, unknown>>(),
    ]);
    const sourceRows = (states.results ?? []).map((row) => ({
      sourceId: row.source_id,
      status: row.status,
      recordCount: Number(row.record_count ?? 0),
      materializedCount: Number((counts.results ?? []).find((item) => item.source_id === row.source_id)?.count ?? 0),
      generatedAt: row.generated_at ?? null,
      lastSuccessAt: row.last_success_at ?? null,
      error: row.error ?? null,
      publishedVersion: row.published_version ?? null,
    }));
    const healthy = sourceRows.length > 0 && sourceRows.every((row) => ["success", "connected", "partial", "archive_only"].includes(String(row.status)) && !row.error);
    return response({ data: { status: healthy ? "healthy" : "degraded", latestRun: latest ?? null, sources: sourceRows }, meta: { version: "v1", checkedAt: new Date().toISOString(), totalSources: sourceRows.length, healthySources: sourceRows.filter((row) => !row.error).length }, links: { self: request.url } }, healthy ? 200 : 503, 0);
  } catch {
    return response({ data: { status: "unavailable", latestRun: null, sources: [] }, meta: { version: "v1", checkedAt: new Date().toISOString(), reason: "DATA_HEALTH_UNAVAILABLE" }, links: { self: request.url } }, 503, 0);
  }
}

async function directory(request: Request, env: Env) {
  if (!env.DB) return error("DATABASE_UNAVAILABLE", "D1 no está disponible.", 503);
  try {
    const result = await env.DB.prepare("SELECT id,nombre,sigla,tipo_organo,director_jefe_actual,ministerio_dependiente FROM servicios_publicos ORDER BY nombre ASC").all<Record<string, unknown>>();
    return success(request, result.results ?? [], { total: result.results?.length ?? 0 }, 3600);
  } catch {
    return error("DATABASE_UNAVAILABLE", "No fue posible consultar el directorio.", 503);
  }
}

async function alerts(request: Request, env: Env) {
  if (!env.DB) return error("DATABASE_UNAVAILABLE", "D1 no está disponible.", 503);
  try {
    const limit = positive(new URL(request.url).searchParams.get("limit"), 100, 200);
    const result = await env.DB.prepare(
      "SELECT id,politico_id,fecha,tipo_alerta,nivel_gravedad,descripcion,evidencia_json FROM alertas_anomalias ORDER BY fecha DESC,id LIMIT ?",
    ).bind(limit).all<Record<string, unknown>>();
    const data = (result.results ?? []).map((row) => ({ ...row, evidencia_json: parseJson(row.evidencia_json as string | null, null) }));
    return success(request, data, { total: data.length, tipoFeed: "registro editorial versionado" }, 300);
  } catch {
    return error("DATABASE_UNAVAILABLE", "El feed de alertas no está disponible.", 503);
  }
}

async function politician(request: Request, env: Env, id: string) {
  if (!env.DB) return error("DATABASE_UNAVAILABLE", "D1 no está disponible.", 503);
  try {
    const row = await env.DB.prepare(
      "SELECT id,nombre_completo,cargo,partido_id,distrito_region,numero_distrito,foto_url,twitter_handle,comisiones,fecha_inicio_periodo,fecha_fin_periodo,activo FROM politicos WHERE id=?",
    ).bind(id).first<Record<string, unknown>>();
    if (!row) return error("NOT_FOUND", "Político no encontrado.", 404);
    const party = row.partido_id ? await env.DB.prepare("SELECT id,nombre,sigla,logo_url,color_hex FROM partidos WHERE id=?").bind(row.partido_id).first<Record<string, unknown>>() : null;
    return success(request, { ...row, partido: party ?? null, evidencia: [], url_ficha: `https://cambiometro.impulsacv.cl/politico/${id}` }, { sourceStatus: "available", stale: false }, 86400);
  } catch {
    return error("DATABASE_UNAVAILABLE", "No fue posible consultar el político.", 503);
  }
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function exportData(request: Request, env: Env) {
  if (await limited(request, env, "export")) return error("RATE_LIMITED", "Demasiadas consultas.", 429);
  if (!env.DB) return error("DATABASE_UNAVAILABLE", "D1 no está disponible.", 503);
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].length === 0) return error("MISSING_PARAMETERS", "Especifique al menos un filtro.", 400);
  const format = params.get("format") === "json" ? "json" : "csv";
  const limit = positive(params.get("limit"), 500, 5000);
  const conditions: string[] = [];
  const bindings: string[] = [];
  for (const [key, column] of [["cargo", "p.cargo"], ["partido", "pa.sigla"], ["distrito_region", "p.distrito_region"]] as const) {
    const value = params.get(key);
    if (value) { conditions.push(`lower(${column}) LIKE ?`); bindings.push(`%${normalized(value)}%`); }
  }
  const query = params.get("q");
  if (query) { conditions.push("(lower(p.nombre_completo) LIKE ? OR lower(pa.sigla) LIKE ? OR lower(p.distrito_region) LIKE ?)"); const term = `%${normalized(query)}%`; bindings.push(term, term, term); }
  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  try {
    const result = await env.DB.prepare(
      `SELECT p.id,p.nombre_completo,p.cargo,pa.sigla AS partido_sigla,p.distrito_region,p.foto_url
       FROM politicos p LEFT JOIN partidos pa ON pa.id=p.partido_id${where} ORDER BY p.nombre_completo LIMIT ?`,
    ).bind(...bindings, limit).all<Record<string, unknown>>();
    const rows = result.results ?? [];
    if (format === "json") return response({ data: rows, meta: { version: "v1", count: rows.length } }, 200, 86400, { "Content-Disposition": "attachment; filename=transparencia_chile.json" });
    const header = "id,nombre_completo,cargo,partido_sigla,distrito_region,foto_url";
    const csv = [header, ...rows.map((row) => [row.id, row.nombre_completo, row.cargo, row.partido_sigla, row.distrito_region, row.foto_url].map(csvCell).join(","))].join("\n");
    return new Response(csv, { status: 200, headers: { ...jsonHeaders, "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "public, max-age=86400", "Content-Disposition": "attachment; filename=transparencia_chile.csv" } });
  } catch {
    return error("DATABASE_UNAVAILABLE", "La exportación no está disponible.", 503);
  }
}

function svgText(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function ogResponse(title: string, subtitle: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#102a43"/><rect x="56" y="56" width="1088" height="518" rx="28" fill="#f7fafc"/><text x="100" y="220" font-family="Arial,sans-serif" font-size="58" font-weight="700" fill="#102a43">${svgText(title)}</text><text x="100" y="300" font-family="Arial,sans-serif" font-size="30" fill="#486581">${svgText(subtitle)}</text><text x="100" y="500" font-family="Arial,sans-serif" font-size="26" fill="#829ab1">El Cambiómetro · datos públicos con trazabilidad</text></svg>`;
  return new Response(svg, { status: 200, headers: { ...jsonHeaders, "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}

async function cspReport(request: Request, env: Env) {
  if (await limited(request, env, "csp-report")) return error("RATE_LIMITED", "Demasiados reportes.", 429);
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 64 * 1024) return error("PAYLOAD_TOO_LARGE", "El reporte excede el tamaño permitido.", 413);
  let body: unknown;
  try { body = await request.json(); } catch { return error("INVALID_BODY", "El cuerpo debe ser JSON válido.", 400); }
  const payload = JSON.stringify(body);
  if (payload.length > 64 * 1024) return error("PAYLOAD_TOO_LARGE", "El reporte excede el tamaño permitido.", 413);
  try {
    if (env.DB) await env.DB.prepare("INSERT INTO security_events (kind,payload) VALUES (?,?)").bind("csp-violation", payload).run();
  } catch {
    // Los reportes no deben bloquear al navegador si D1 está temporalmente no disponible.
  }
  return response({ ok: true }, 202, 0);
}

async function requests(request: Request, env: Env) {
  if (await limited(request, env, "requests")) return error("RATE_LIMITED", "Demasiadas solicitudes.", 429);
  let body: unknown;
  try { body = await request.json(); } catch { return error("INVALID_BODY", "El cuerpo debe ser JSON válido.", 400); }
  if (!body || typeof body !== "object") return error("INVALID_BODY", "El cuerpo debe ser un objeto JSON.", 400);
  const values = body as Record<string, unknown>;
  const allowedTypes = new Set(["rectificacion", "cancelacion", "oposicion", "acceso", "informacion", "otro"]);
  const tipo = typeof values.tipo === "string" ? values.tipo : "";
  const nombre = typeof values.nombre === "string" ? values.nombre.trim() : "";
  const email = typeof values.email === "string" ? values.email.trim().toLowerCase() : "";
  const descripcion = typeof values.descripcion === "string" ? values.descripcion.trim() : "";
  const turnstileToken = typeof values.turnstileToken === "string" ? values.turnstileToken : "";
  if (!allowedTypes.has(tipo)) return error("INVALID_TYPE", "Tipo de solicitud no válido.", 400);
  if (!/^[^@\s]{1,120}@[^@\s]{1,120}\.[a-zA-Z]{2,}$/.test(email)) return error("INVALID_EMAIL", "Correo electrónico no válido.", 400);
  if (descripcion.length < 10 || descripcion.length > 4000) return error("INVALID_DESCRIPTION", "La descripción debe tener entre 10 y 4000 caracteres.", 400);
  if (typeof values.website === "string" && values.website.trim()) return error("SPAM_DETECTED", "Solicitud rechazada.", 400);
  if (!env.TURNSTILE_SECRET || !turnstileToken) return error("TURNSTILE_FAILED", "No se pudo verificar el formulario. Intente nuevamente.", 403);
  try {
    const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: turnstileToken, remoteip: request.headers.get("CF-Connecting-IP") ?? "" }),
    });
    const result = await verification.json() as { success?: boolean };
    if (!verification.ok || !result.success) return error("TURNSTILE_FAILED", "No se pudo verificar el formulario. Intente nuevamente.", 403);
  } catch {
    return error("TURNSTILE_FAILED", "No se pudo verificar el formulario. Intente nuevamente.", 403);
  }
  if (!env.DB) return error("STORAGE_UNAVAILABLE", "El canal no está disponible ahora.", 503);
  try {
    const result = await env.DB.prepare("INSERT INTO data_requests (tipo,nombre,email,descripcion,ip_hash,estado) VALUES (?,?,?,?,?,?)")
      .bind(tipo, nombre || null, email, descripcion, request.headers.get("CF-Connecting-IP") ?? null, "recibida").run();
    return response({ data: { id: result.meta.last_row_id, estado: "recibida" }, meta: { respuestaPlazo: "El plazo está definido en /privacidad conforme a la Ley 21.715." } }, 202, 0);
  } catch {
    return error("INTERNAL_ERROR", "No fue posible registrar la solicitud.", 500);
  }
}

function unavailableContract(code: string, message: string) {
  return response({ status: "unavailable", code, message, public_api: { documentation_url: "https://cambiometro.impulsacv.cl/como-funciona", authentication: "No requerida para los endpoints públicos actuales" } }, 503, 0);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: jsonHeaders });
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return new Response("Not found", { status: 404 });
    if (url.pathname === "/api/csp-report" && request.method === "POST") return cspReport(request, env);
    if (url.pathname === "/api/v1/requests" && request.method === "POST") return requests(request, env);
    if (!['GET', 'HEAD'].includes(request.method)) return error("METHOD_NOT_ALLOWED", "Método no permitido.", 405);
    if (url.pathname === "/api/health" || url.pathname === "/api/v1/health") return health(request, env);
    if (url.pathname === "/api/v1/health/data") return dataHealth(request, env);
    if (url.pathname === "/api/v1/search") return search(request, env);
    if (url.pathname === "/api/v1/sources") return sources(request, env);
    if (url.pathname === "/api/v1/records") return records(request, env);
    if (url.pathname === "/api/v1/relations") return relations(request, env);
    if (url.pathname === "/api/v1/crosses") return crosses(request, env);
    if (url.pathname === "/api/v1/alertas") return alerts(request, env);
    if (url.pathname === "/api/directorio") return directory(request, env);
    if (url.pathname === "/api/v1/transferencias") return transferencias(request, env);
    if (url.pathname === "/api/v1/export") return exportData(request, env);
    if (url.pathname === "/api/v1/commercial/keys") return unavailableContract("API_KEY_PROVISIONING_UNAVAILABLE", "El provisionamiento de llaves comerciales todavía no está configurado.");
    if (url.pathname === "/api/push") return unavailableContract("PUSH_SUBSCRIPTIONS_DISABLED", "Las suscripciones push no están habilitadas.");
    if (url.pathname === "/api/og/site") return ogResponse("Datos públicos con trazabilidad", "Autoridades · instituciones · registros · fuentes oficiales");
    if (url.pathname === "/api/funcionarios" || url.pathname === "/api/v1/funcionarios") return funcionarios(request, env);
    const match = url.pathname.match(/^\/api\/v1\/entities\/([a-z0-9_-]{1,160})$/);
    if (match) return entity(request, env, match[1]);
    const politicianMatch = url.pathname.match(/^\/api\/v1\/politico\/([a-z0-9_-]{1,160})$/);
    if (politicianMatch) return politician(request, env, politicianMatch[1]);
    const ogPoliticoMatch = url.pathname.match(/^\/api\/og\/([a-z0-9_-]{1,160})$/);
    if (ogPoliticoMatch) {
      if (!env.DB) return unavailableContract("DATABASE_UNAVAILABLE", "D1 no está disponible.");
      try {
        const row = await env.DB.prepare("SELECT nombre_completo,cargo,distrito_region FROM politicos WHERE id=?").bind(ogPoliticoMatch[1]).first<{ nombre_completo: string; cargo: string; distrito_region: string }>();
        return row ? ogResponse(row.nombre_completo, `${row.cargo} · ${row.distrito_region}`) : new Response("Not found", { status: 404, headers: jsonHeaders });
      } catch {
        return unavailableContract("DATABASE_UNAVAILABLE", "No fue posible consultar el político.");
      }
    }
    return error("NOT_FOUND", "Endpoint no encontrado.", 404);
  },
};

export default worker;
