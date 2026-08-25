export interface RateLimiterLike {
  limit(input: { key: string }): Promise<{ success: boolean }>;
}

export async function rateLimitResponse(
  request: Request,
  limiter: RateLimiterLike | undefined,
  scope: string,
): Promise<Response | null> {
  const clientAddress = request.headers.get("cf-connecting-ip");
  if (!limiter || !clientAddress) return null;
  const result = await limiter.limit({ key: `${scope}:${clientAddress}` });
  if (result.success) return null;

  return Response.json({
    error: {
      code: "RATE_LIMITED",
      message: "Demasiadas solicitudes. Intente nuevamente en un minuto.",
    },
  }, {
    status: 429,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
      "Retry-After": "60",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

interface RateRecord {
  timestamps: number[];
}
const inMemoryRateLimits = new Map<string, RateRecord>();

export function checkMemoryRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = inMemoryRateLimits.get(key) ?? { timestamps: [] };
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
  if (record.timestamps.length >= maxRequests) {
    inMemoryRateLimits.set(key, record);
    return false;
  }
  record.timestamps.push(now);
  inMemoryRateLimits.set(key, record);
  return true;
}

export function resetMemoryRateLimits(): void {
  inMemoryRateLimits.clear();
}

export async function enforcePublicRateLimit(request: Request, scope: string) {
  void request;
  void scope;
  return null;
}

export async function enforceExportRateLimit(request: Request): Promise<Response | null> {
  const clientAddress = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || "127.0.0.1";

  const allowed = checkMemoryRateLimit(`export:${clientAddress}`, 5, 60_000);
  if (!allowed) {
    return Response.json({
      error: {
        code: "RATE_LIMITED",
        message: "Límite de descargas alcanzado (máximo 5 solicitudes por minuto). Intente nuevamente en un minuto.",
      },
    }, {
      status: 429,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
        "Retry-After": "60",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  }

  const cfLimited = await enforcePublicRateLimit(request, "export");
  if (cfLimited) return cfLimited;

  return null;
}
