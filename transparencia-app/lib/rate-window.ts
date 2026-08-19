import { createHash } from "node:crypto";

const WINDOW_MINUTES = 6 * 60;
const MAX_EVENTS = 10;
const PURGE_OLDER_THAN_DAYS = 7;

interface D1Statement {
  bind(...values: Array<string | number | null>): {
    run(): Promise<{ success: boolean }>;
    first<T>(): Promise<T | null>;
    all<T>(): Promise<{ results: T[] }>;
  };
}

interface D1Like {
  prepare(statement: string): D1Statement;
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(`rate:${ip}`).digest("hex").slice(0, 24);
}

export function clientIp(request: Request): string | null {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip");
}

export async function enforceSlidingWindowRateLimit(
  db: D1Like | undefined,
  request: Request,
  scope: string,
): Promise<boolean> {
  const ip = clientIp(request);
  if (!db || !ip) return true;
  const ipHash = hashIp(ip);

  const cutoff = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  await db.prepare(
    "DELETE FROM request_rate_events WHERE created_at < ?",
  ).bind(cutoff).run();

  const recent = await db.prepare(
    "SELECT COUNT(*) AS total FROM request_rate_events WHERE ip_hash = ? AND scope = ? AND created_at >= ?",
  ).bind(ipHash, scope, cutoff).first<{ total: number }>();
  if (!recent) return true;

  if ((recent.total ?? 0) >= MAX_EVENTS) return false;

  await db.prepare(
    "INSERT INTO request_rate_events (ip_hash, scope) VALUES (?, ?)",
  ).bind(ipHash, scope).run();

  const purgeCutoff = new Date(Date.now() - PURGE_OLDER_THAN_DAYS * 24 * 60 * 60_000).toISOString();
  await db.prepare(
    "DELETE FROM request_rate_events WHERE created_at < ?",
  ).bind(purgeCutoff).run();

  return true;
}
