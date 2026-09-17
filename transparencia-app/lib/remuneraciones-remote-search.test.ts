import { describe, expect, it } from "vitest";
import { searchTransparencyActiva } from "./remuneraciones-remote-search";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("búsqueda remota de Transparencia Activa", () => {
  it("usa la ruta combinada cuando responde correctamente", async () => {
    const calls: string[] = [];
    const result = await searchTransparencyActiva({
      query: "Lucy",
      fetchImpl: async (input) => {
        calls.push(String(input));
        return response({ data: [{ id: "central-1", nombre_completo: "Lucy" }], meta: { total: 1 } });
      },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("scope=all");
    expect(result).toMatchObject({ total: 1, partial: false });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].sourceScope).toBeUndefined();
  });

  it("separa municipal y central cuando la ruta combinada falla", async () => {
    const calls: string[] = [];
    const result = await searchTransparencyActiva({
      query: "Lucy",
      fetchImpl: async (input) => {
        const url = String(input);
        calls.push(url);
        if (url.includes("scope=all")) return response({ error: "temporal" }, 503);
        if (url.includes("scope=municipal")) return response({ data: [{ id: "muni-1", nombre_completo: "Lucy" }], meta: { total: 1 } });
        return response({ data: [{ id: "central-1", nombre_completo: "Lucy" }], meta: { total: 1 } });
      },
    });

    expect(calls).toHaveLength(3);
    expect(result).toMatchObject({ total: 2, partial: false });
    expect(result.rows.map((row) => row.id).sort()).toEqual(["central-1", "muni-1"]);
    expect(result.rows.find((row) => row.id === "central-1")?.sourceScope).toBe("central");
    expect(result.rows.find((row) => row.id === "muni-1")?.sourceScope).toBe("municipal");
  });

  it("marca la respuesta parcial sin ocultar la fuente que sí responde", async () => {
    const result = await searchTransparencyActiva({
      query: "Lucy",
      fetchImpl: async (input) => String(input).includes("scope=municipal")
        ? response({ data: [{ id: "muni-1", nombre_completo: "Lucy" }], meta: { total: 1 } })
        : response({ error: "temporal" }, 503),
    });

    expect(result).toMatchObject({ total: 1, partial: true });
    expect(result.rows[0].id).toBe("muni-1");
    expect(result.rows[0].sourceScope).toBe("municipal");
  });

  it("puede consultar el Worker público desde un preview local", async () => {
    const calls: string[] = [];
    await searchTransparencyActiva({
      query: "Latorre",
      apiOrigin: "https://cambiometro.impulsacv.cl",
      fetchImpl: async (input) => {
        calls.push(String(input));
        return response({ data: [], meta: { total: 0 } });
      },
    });

    expect(calls[0]).toMatch(/^https:\/\/cambiometro\.impulsacv\.cl\/api\/funcionarios\?/);
  });

  it("envía la página y el tamaño solicitados para no limitarse al primer bloque", async () => {
    const calls: string[] = [];
    await searchTransparencyActiva({
      query: "asesor",
      page: 3,
      limit: 15,
      apiOrigin: "https://cambiometro.impulsacv.cl",
      fetchImpl: async (input) => {
        calls.push(String(input));
        return response({ data: [], meta: { total: 45 } });
      },
    });

    const url = new URL(calls[0]);
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("limit")).toBe("15");
  });
});
