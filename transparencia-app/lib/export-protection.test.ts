import { describe, it, expect } from "vitest";
import api from "../workers/public-api/index";

function testEnv() {
  let calls = 0;
  const statement = (sql: string, bindings: unknown[] = []) => ({
    bind(...values: unknown[]) { return statement(sql, values); },
    async all<T>() {
      if (sql.includes("FROM entities")) {
        return { results: [{ id: "person-1", name: "Persona de prueba", kind: "person", attributes_json: JSON.stringify({ cargo: "Diputado" }), source_ids_json: '["camara"]' }] } as T;
      }
      return { results: [] } as T;
    },
    async first<T>() { return null as T; },
  });
  return {
    DB: { prepare: (sql: string) => statement(sql) },
    EXPENSIVE_API_RATE_LIMITER: { limit: async () => ({ success: ++calls <= 5 }) },
  } as never;
}

describe("Endpoint /api/v1/export - Protecciones y Filtros", () => {
  it("rechaza peticiones sin parámetros con HTTP 400 y código MISSING_PARAMETERS", async () => {
    const response = await api.fetch(new Request("https://example.test/api/v1/export"), testEnv());
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.code).toBe("MISSING_PARAMETERS");
  });

  it("permite peticiones válidas con format=csv retornando HTTP 200", async () => {
    const response = await api.fetch(new Request("https://example.test/api/v1/export?format=csv&limit=5"), testEnv());
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    const text = await response.text();
    expect(text).toContain("id,nombre_completo,cargo");
  });

  it("permite peticiones válidas con format=json retornando HTTP 200", async () => {
    const response = await api.fetch(new Request("https://example.test/api/v1/export?format=json&cargo=diputad&limit=5"), testEnv());
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    const json = await response.json();
    expect(json).toHaveProperty("data");
    expect(json).toHaveProperty("meta");
  });

  it("aplica filtros por cargo y limita resultados", async () => {
    const response = await api.fetch(new Request("https://example.test/api/v1/export?format=json&cargo=diputad&limit=5"), testEnv());
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.length).toBeLessThanOrEqual(5);
  });

  it("aplica rate limit estricto de 5 req/min por IP", async () => {
    const env = testEnv();

    // 5 peticiones permitidas
    for (let i = 0; i < 5; i++) {
      const res = await api.fetch(new Request("https://example.test/api/v1/export?format=csv", { headers: { "cf-connecting-ip": "192.0.2.20" } }), env);
      expect(res.status).toBe(200);
    }

    // 6ta petición debe retornar HTTP 429
    const limitedRes = await api.fetch(new Request("https://example.test/api/v1/export?format=csv", { headers: { "cf-connecting-ip": "192.0.2.20" } }), env);
    expect(limitedRes.status).toBe(429);
    const json = await limitedRes.json();
    expect(json.error.code).toBe("RATE_LIMITED");
  });
});
