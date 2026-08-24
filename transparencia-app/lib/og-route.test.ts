import { describe, expect, it } from "vitest";
import api from "../workers/public-api/index";

describe("GET /api/og/site", () => {
  it("dispone de una ruta estática estable que siempre devuelve SVG", async () => {
    const response = await api.fetch(new Request("https://example.test/api/og/site"), {});
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^image\/svg\+xml/);
    expect(body).toContain("<svg");
    expect(body).toContain("EL CAMBIÓMETRO");
  });
});
