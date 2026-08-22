import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/v1/export/route";
import { resetMemoryRateLimits } from "@/lib/rate-limit";

describe("Endpoint /api/v1/export - Protecciones y Filtros", () => {
  beforeEach(() => {
    resetMemoryRateLimits();
  });

  it("rechaza peticiones sin parámetros con HTTP 400 y código MISSING_PARAMETERS", async () => {
    const request = new Request("http://localhost:3000/api/v1/export", {
      headers: { "cf-connecting-ip": "192.168.1.10" },
    });
    const response = await GET(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error.code).toBe("MISSING_PARAMETERS");
    expect(json.error.message).toContain("Filtros obligatorios");
  });

  it("permite peticiones válidas con format=csv retornando HTTP 200", async () => {
    const request = new Request("http://localhost:3000/api/v1/export?format=csv", {
      headers: { "cf-connecting-ip": "192.168.1.11" },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv");
    const text = await response.text();
    expect(text).toContain("id,nombre_completo,cargo");
  });

  it("permite peticiones válidas con format=json retornando HTTP 200", async () => {
    const request = new Request("http://localhost:3000/api/v1/export?format=json", {
      headers: { "cf-connecting-ip": "192.168.1.12" },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    const json = await response.json();
    expect(json).toHaveProperty("data");
    expect(json).toHaveProperty("meta");
  });

  it("aplica filtros por cargo y limita resultados", async () => {
    const request = new Request("http://localhost:3000/api/v1/export?format=json&cargo=diputad&limit=5", {
      headers: { "cf-connecting-ip": "192.168.1.13" },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.length).toBeLessThanOrEqual(5);
  });

  it("aplica rate limit estricto de 5 req/min por IP", async () => {
    const ip = "192.168.1.99";

    // 5 peticiones permitidas
    for (let i = 0; i < 5; i++) {
      const req = new Request("http://localhost:3000/api/v1/export?format=csv", {
        headers: { "cf-connecting-ip": ip },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
    }

    // 6ta petición debe retornar HTTP 429
    const limitedReq = new Request("http://localhost:3000/api/v1/export?format=csv", {
      headers: { "cf-connecting-ip": ip },
    });
    const limitedRes = await GET(limitedReq);
    expect(limitedRes.status).toBe(429);
    const json = await limitedRes.json();
    expect(json.error.code).toBe("RATE_LIMITED");
  });
});
