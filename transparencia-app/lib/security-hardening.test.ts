import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { csvCell, formatCLP } from "./format";
import api from "../workers/public-api/index";
import { apiSuccess, parseRecordQuery, parseRelationQuery } from "./api-v1";
import { rateLimitResponse } from "./rate-limit";

const projectRoot = resolve(import.meta.dirname, "..");

describe("endurecimiento del runtime publico", () => {
  it("publica una CSP estatica y no permite evaluar codigo en produccion", () => {
    const headers = readFileSync(resolve(projectRoot, "public/_headers"), "utf8");
    expect(headers).toContain("Content-Security-Policy:");
    expect(headers).not.toContain("'unsafe-inline'");
    const csp = headers.match(/Content-Security-Policy:\s+(.+)/)?.[1] ?? "";

    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it("oculta cabeceras de tecnologia y limita los hosts de imagen", () => {
    const nextConfig = readFileSync(resolve(projectRoot, "next.config.ts"), "utf8");
    expect(nextConfig).toContain("poweredByHeader: false");
    expect(nextConfig).not.toContain('hostname: "**"');
  });

  it("no publica metodos de mutacion mientras no existe autenticacion", () => {
    const worker = readFileSync(resolve(projectRoot, "workers/public-api/index.ts"), "utf8");
    expect(worker).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(worker).toContain('path === "/api/push"');
  });

  it("rechaza identificadores y predicados fuera de su formato permitido", () => {
    expect(() => parseRecordQuery("https://example.test/api/v1/records?entity_id=' OR 1=1--")).toThrow("INVALID_QUERY");
    expect(() => parseRelationQuery("https://example.test/api/v1/relations?predicate=" + "a".repeat(81))).toThrow("INVALID_QUERY");
  });

  it("marca las APIs como no indexables y restringe capacidades del navegador", async () => {
    const response = apiSuccess([], { total: 0 }, { self: "https://example.test/api/v1/records" });
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
    expect(response.headers.get("Permissions-Policy")).toContain("camera=()");
    expect(response.headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
  });

  it("neutraliza formulas al exportar CSV", () => {
    expect(csvCell("=HYPERLINK(\"https://attacker.test\")")).toBe('"\'=HYPERLINK(""https://attacker.test"")"');
    expect(csvCell("@SUM(1+1)")).toBe('"\'@SUM(1+1)"');
    expect(csvCell("dato seguro")).toBe('"dato seguro"');
  });

  it("limita consultas costosas y enumeracion masiva", async () => {
    const shortSearch = await api.fetch(new Request("https://example.test/api/v1/search?q=a"), {});
    const longSearch = await api.fetch(new Request(`https://example.test/api/v1/search?q=${"a".repeat(81)}`), {});
    const invalidOfficials = await api.fetch(new Request("https://example.test/api/funcionarios?contrato=administrador&sortBy=sql"), {});

    expect(shortSearch.status).toBe(400);
    expect(longSearch.status).toBe(400);
    expect(invalidOfficials.status).toBe(400);
  });

  it("mantiene una cobertura parcial verificable si la proyeccion CPLT no esta publicada", async () => {
    const response = await api.fetch(new Request("https://example.test/api/funcionarios?muni=muni-maipu&limit=10"), {});
    expect(response.status).toBe(503);
  });

  it("acota cada grupo de resultados del buscador publico", async () => {
    const response = await api.fetch(new Request("https://example.test/api/v1/search?q=an"), {});
    expect(response.status).toBe(503);
  }, 15000);

  it("responde 429 cuando Cloudflare agota el cupo de una API costosa", async () => {
    const request = new Request("https://example.test/api/v1/search?q=datos", {
      headers: { "cf-connecting-ip": "192.0.2.10" },
    });
    const response = await rateLimitResponse(request, { limit: async () => ({ success: false }) }, "search");

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("60");
    expect(response?.headers.get("Cache-Control")).toBe("no-store");
  });
});
