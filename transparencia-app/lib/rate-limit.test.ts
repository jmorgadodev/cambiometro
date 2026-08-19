import { describe, expect, it } from "vitest";
import { rateLimitResponse, type RateLimiterLike } from "@/lib/rate-limit";

function requestWithIp(ip: string | null = "203.0.113.7") {
  const headers = new Headers();
  if (ip) headers.set("cf-connecting-ip", ip);
  return new Request("https://cambiometro.impulsacv.cl/api/v1/search?q=test", { headers });
}

function stubLimiter(results: boolean[]): RateLimiterLike {
  let index = 0;
  return {
    async limit() {
      const success = results[Math.min(index, results.length - 1)];
      index += 1;
      return { success };
    },
  };
}

describe("rateLimitResponse (429 determinístico)", () => {
  it("no limita cuando el binding no existe o no hay IP", async () => {
    expect(await rateLimitResponse(requestWithIp(), undefined, "search")).toBeNull();
    expect(await rateLimitResponse(requestWithIp(null), stubLimiter([true]), "search")).toBeNull();
  });

  it("devuelve 429 con contrato RATE_LIMITED cuando el limiter niega", async () => {
    const response = await rateLimitResponse(requestWithIp(), stubLimiter([false]), "search");
    expect(response).not.toBeNull();
    expect(response?.status).toBe(429);
    const payload = await response?.json();
    expect(payload.error.code).toBe("RATE_LIMITED");
    expect(response?.headers.get("Retry-After")).toBe("60");
    expect(response?.headers.get("Cache-Control")).toBe("no-store");
    expect(response?.headers.get("X-Robots-Tag")).toContain("noindex");
  });

  it("clave por scope+IP (misma IP en scope distinto no se bloquea entre sí)", async () => {
    const calls: string[] = [];
    const limiter: RateLimiterLike = {
      async limit(input) {
        calls.push(input.key);
        return { success: true };
      },
    };
    await rateLimitResponse(requestWithIp("203.0.113.9"), limiter, "search");
    await rateLimitResponse(requestWithIp("203.0.113.9"), limiter, "requests");
    await rateLimitResponse(requestWithIp("203.0.113.10"), limiter, "search");
    expect(calls).toEqual([
      "search:203.0.113.9",
      "requests:203.0.113.9",
      "search:203.0.113.10",
    ]);
  });
});
