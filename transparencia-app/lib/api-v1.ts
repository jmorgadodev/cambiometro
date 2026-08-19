import type { EvidenceKind } from "@/lib/data-contracts";


const EVIDENCE_KINDS = new Set<EvidenceKind>([
  "authority", "purchase", "contract", "expense", "budget_execution", "transfer",
  "audit", "declaration", "lobby", "vote", "attendance", "remuneration",
]);

export class QueryValidationError extends Error {
  constructor(public readonly details: Record<string, string>) {
    super("INVALID_QUERY");
  }
}

export function apiSuccess(data: unknown, meta: Record<string, unknown>, links: Record<string, string | null>, cacheSeconds = 300) {
  return Response.json({
    data,
    meta: {
      version: "v1",
      updatedAt: meta.updatedAt ?? null,
      sourceStatus: meta.sourceStatus ?? "available",
      stale: meta.stale ?? false,
      ...meta,
    },
    links,
  }, {
    headers: {
      "Cache-Control": `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 12}`,
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  });
}

export function apiError(code: string, message: string, status: number, details?: unknown) {
  return Response.json({ error: { code, message, ...(details === undefined ? {} : { details }) } }, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  });
}

function readLimit(params: URLSearchParams, details: Record<string, string>): number {
  const raw = params.get("limit");
  if (raw === null) return 20;
  if (!/^\d+$/.test(raw) || Number(raw) < 1) {
    details.limit = "Debe ser un entero positivo de hasta 100.";
    return 20;
  }
  return Math.min(100, Number(raw));
}

function readCursor(params: URLSearchParams, details: Record<string, string>): string | undefined {
  const cursor = params.get("cursor") ?? undefined;
  if (cursor && (cursor.length > 32 || !/^v1_[0-9a-z]+$/.test(cursor))) details.cursor = "Cursor inválido.";
  return cursor;
}

function readDate(params: URLSearchParams, key: "from" | "to", details: Record<string, string>) {
  const value = params.get(key) ?? undefined;
  if (value) {
    const validFormat = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const parsed = validFormat ? new Date(`${value}T00:00:00Z`) : null;
    if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      details[key] = "Use una fecha ISO-8601 YYYY-MM-DD válida.";
    }
  }
  return value;
}

function readIdentifier(params: URLSearchParams, key: string, details: Record<string, string>) {
  const value = params.get(key) ?? undefined;
  if (value && !/^[a-z0-9][a-z0-9_-]{0,159}$/.test(value)) details[key] = "Identificador inválido.";
  return value;
}

function readPredicate(params: URLSearchParams, details: Record<string, string>) {
  const value = params.get("predicate") ?? undefined;
  if (value && !/^[a-z][a-z0-9_]{0,79}$/.test(value)) details.predicate = "Predicado inválido.";
  return value;
}

function readSource(params: URLSearchParams, details: Record<string, string>) {
  const source = params.get("source") ?? undefined;
  const validSources = new Set([
    "infoprobidad", "infolobby", "camara", "senado", "chilecompra", "dipres", "sinim",
    "contraloria", "ley-19862", "transparencia-activa", "servel", "votaciones_camara",
    "votaciones_senado", "gastos_camara", "gastos_senado", "asistencia_camara", "personal-apoyo",
  ]);
  if (source && !validSources.has(source)) details.source = `Valor no permitido: ${source}`;
  return source;
}

function finish<T extends Record<string, unknown>>(values: T, details: Record<string, string>): T {
  if (Object.keys(details).length > 0) throw new QueryValidationError(details);
  return values;
}

export function parseRecordQuery(url: string) {
  const params = new URL(url).searchParams;
  const details: Record<string, string> = {};
  const kind = params.get("kind") as EvidenceKind | null;
  if (kind && !EVIDENCE_KINDS.has(kind)) details.kind = `Valor no permitido: ${kind}`;
  return finish({
    entityId: readIdentifier(params, "entity_id", details),
    kind: kind ?? undefined,
    source: readSource(params, details),
    from: readDate(params, "from", details),
    to: readDate(params, "to", details),
    limit: readLimit(params, details),
    cursor: readCursor(params, details),
  }, details);
}

export function parseRelationQuery(url: string) {
  const params = new URL(url).searchParams;
  const details: Record<string, string> = {};
  return finish({
    entityId: readIdentifier(params, "entity_id", details),
    fromId: readIdentifier(params, "from_id", details),
    toId: readIdentifier(params, "to_id", details),
    predicate: readPredicate(params, details),
    limit: readLimit(params, details),
    cursor: readCursor(params, details),
  }, details);
}

export function parseCrossQuery(url: string) {
  const params = new URL(url).searchParams;
  const base = parseRecordQuery(url);
  const details: Record<string, string> = {};
  return finish({
    ...base,
    entityId: readIdentifier(params, "entity_id", details),
    counterpartyId: readIdentifier(params, "counterparty_id", details),
    predicate: readPredicate(params, details),
  }, details);
}

export function pageLinks(requestUrl: string, nextCursor: string | null) {
  const current = new URL(requestUrl);
  if (!nextCursor) return { self: current.toString(), next: null };
  const next = new URL(current);
  next.searchParams.set("cursor", nextCursor);
  return { self: current.toString(), next: next.toString() };
}

export function queryErrorResponse(error: unknown): Response {
  if (error instanceof QueryValidationError) {
    return apiError("INVALID_QUERY", "Parámetros de consulta inválidos.", 400, error.details);
  }
  if (error instanceof Error && error.message === "INVALID_CURSOR") {
    return apiError("INVALID_QUERY", "Parámetros de consulta inválidos.", 400, { cursor: "Cursor inválido." });
  }
  return apiError("INTERNAL_ERROR", "No fue posible procesar la consulta.", 500);
}
