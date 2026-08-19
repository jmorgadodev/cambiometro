import { describe, expect, it, vi } from "vitest";
import { discoverOfficialSource, extractOfficialAssets, inventoryOfficialSources, mergeInventoryOutcomes } from "../scripts/etl/connectors/official-inventory.mjs";

describe("inventario de índices oficiales", () => {
  it("extrae sólo recursos de dominios oficiales y deduplica enlaces", () => {
    const html = `<html><body><a href="/datos/ejecucion-2025.csv">CSV 2025</a><a href="https://evil.test/datos.csv">externo</a><a href="/datos/ejecucion-2025.csv">duplicado</a></body></html>`;
    expect(extractOfficialAssets(html, "https://www.dipres.gob.cl/indice", ["dipres.gob.cl"])).toEqual([
      { url: "https://www.dipres.gob.cl/datos/ejecucion-2025.csv", label: "CSV 2025" },
    ]);
  });

  it("registra checksum, períodos y estado parcial sin confundir descubrimiento con conexión completa", async () => {
    const fetchImpl = vi.fn(async () => new Response(`<html><body>${"x".repeat(100)}<a href="/archivo/resultados-2024.xlsx">Resultados</a></body></html>`));
    const result = await discoverOfficialSource("servel", { fetchImpl: fetchImpl as typeof fetch });
    expect(result).toMatchObject({ id: "servel", status: "partial", periods: ["2024"], assetCount: 1 });
    expect(result.indexChecksumSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("aísla una fuente caída y continúa inventariando las demás", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("senado")) throw new Error("timeout");
      return new Response(`<html><body>${"x".repeat(120)}</body></html>`);
    });
    const results = await inventoryOfficialSources(["camara", "senado"], { fetchImpl: fetchImpl as typeof fetch });
    expect(results.map((result) => result.status)).toEqual(["partial", "unavailable"]);
  });

  it("conserva el último inventario válido como atrasado cuando cae la fuente", () => {
    const merged = mergeInventoryOutcomes(
      { generatedAt: "2026-08-01T00:00:00Z", sources: [{ id: "dipres", status: "partial", assets: [{ url: "https://dipres.gob.cl/real.csv" }] }] },
      [{ id: "dipres", status: "unavailable", error: "timeout" }],
      "2026-08-08T00:00:00Z",
    );
    expect(merged[0]).toMatchObject({ status: "stale", error: "timeout", assets: [{ url: "https://dipres.gob.cl/real.csv" }] });
  });
});
