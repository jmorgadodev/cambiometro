import { afterEach, describe, expect, it, vi } from "vitest";
import api from "../workers/public-api/index";

afterEach(() => vi.unstubAllGlobals());

describe("public directory cache", () => {
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
