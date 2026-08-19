import { describe, expect, it } from "vitest";
import { GET } from "../app/api/og/site/route";

describe("GET /api/og/site", () => {
  it("dispone de una ruta estática estable que siempre devuelve SVG", async () => {
    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^image\/svg\+xml/);
    expect(body).toContain("<svg");
    expect(body).toContain("EL CAMBIÓMETRO");
  });
});
