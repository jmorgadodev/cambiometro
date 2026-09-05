import { afterEach, describe, expect, it, vi } from "vitest";
import api, { cacheControlForStorage } from "../workers/public-api/index";

afterEach(() => vi.unstubAllGlobals());

describe("public directory cache", () => {
  it("preserves the endpoint TTL while removing unsupported stale directives", () => {
    expect(cacheControlForStorage("public, max-age=30, s-maxage=3600, stale-while-revalidate=86400"))
      .toBe("public, max-age=30, s-maxage=3600");
    expect(cacheControlForStorage(null)).toBe("public, max-age=30, s-maxage=300");
  });

  it("prefers the published R2 catalog before touching D1", async () => {
    const prepare = vi.fn(() => ({
      bind() { return this; },
      async first() { return { total: 999999 }; },
      async all() { return { results: [] }; },
    }));
    const files: Record<string, unknown> = {
      "projections/static-site-v1/manifest.json": {
        files: [{ path: "data/catalog/entities-routes.json", key: "catalog/entities.json" }],
      },
      "catalog/entities.json": [{
        id: "person-r2",
        kind: "person",
        name: "Persona publicada",
        identifiers: [],
        attributes: {},
        sourceIds: ["camara"],
      }],
    };
    const env = {
      DB: { prepare },
      PUBLIC_DATA: {
        get: async (key: string) => files[key] === undefined ? null : { json: async <T>() => files[key] as T },
      },
    } as never;

    const response = await api.fetch(new Request("https://example.test/api/directorio?limit=1"), env);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data[0]).toMatchObject({ id: "person-r2", name: "Persona publicada" });
    expect(payload.meta.total).toBe(1);
    expect(prepare).not.toHaveBeenCalled();
  });

  it("reuses a successful response without rereading D1 and preserves pagination", async () => {
    const responses = new Map<string, Response>();
    vi.stubGlobal("caches", { default: {
      match: async (request: Request) => responses.get(request.url)?.clone(),
      put: async (request: Request, response: Response) => {
        expect(response.headers.get("Cache-Control")).not.toContain("stale-while-revalidate");
        responses.set(request.url, response.clone());
      },
    } });
    const prepare = vi.fn(() => {
      const statement = {
        bind: () => statement,
        first: async () => ({ total: 2 }),
        all: async () => ({ results: [{ id: "person-1", kind: "person", name: "Persona", identifiers_json: "[]", attributes_json: "{}", source_ids_json: "[]" }] }),
      };
      return statement;
    });
    const env = { DB: { prepare } } as never;
    const request = new Request("https://example.test/api/directorio?limit=1");
    const first = await api.fetch(request, env);
    const second = await api.fetch(request, env);
    expect(first.headers.get("X-Cambiometro-Cache")).toBe("MISS");
    expect(second.headers.get("X-Cambiometro-Cache")).toBe("HIT");
    expect(await first.json()).toEqual(await second.json());
    expect(prepare).toHaveBeenCalledTimes(2);
    const otherPage = await api.fetch(new Request("https://example.test/api/directorio?limit=1&offset=1"), env);
    expect(otherPage.headers.get("X-Cambiometro-Cache")).toBe("MISS");
    expect(prepare).toHaveBeenCalledTimes(4);
  });

  it("keeps the endpoint working when the edge cache is unavailable", async () => {
    vi.stubGlobal("caches", { default: { match: async () => { throw new Error("cache unavailable"); } } });
    const response = await api.fetch(new Request("https://example.test/api/v1/records?limit=1"), {});
    expect(response.status).toBe(503);
    expect(response.headers.get("X-Cambiometro-Cache")).toBe("BYPASS");
  });
});
