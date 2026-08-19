import { getCloudflareContext } from "@opennextjs/cloudflare";

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

export async function enforcePublicRateLimit(request: Request, scope: string) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const limiter = (env as typeof env & { EXPENSIVE_API_RATE_LIMITER?: RateLimiterLike }).EXPENSIVE_API_RATE_LIMITER;
    return rateLimitResponse(request, limiter, scope);
  } catch {
    return null;
  }
}
