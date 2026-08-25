import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "../middleware";

describe("middleware CSP y cache del HTML", () => {
  it("no cachea HTML que contiene un nonce generado por request", () => {
    const response = middleware(new NextRequest("https://example.test/municipalidades/maipu"));

    expect(response.headers.get("Content-Security-Policy")).toContain("script-src");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
    expect(response.headers.get("Cloudflare-CDN-Cache-Control")).toBe("no-store");
  });

  it("mantiene el contrato de redirección legado", () => {
    const response = middleware(new NextRequest("https://example.test/municipalidades/muni-maipu"));

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toContain("/municipalidades/maipu");
  });
});
