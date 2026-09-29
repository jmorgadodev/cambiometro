import { describe, expect, it, vi } from "vitest";
import { assertSenadoSupportCollection, fetchSenadoSupportPage, parseSenadoSupportPage } from "./senado-support.mjs";

const payload = (page = 1, rows = [{ id: 1, attributes: { ano: 2026, mes: 7, unidad_laboral: "SENADOR/A", monto: 0 } }]) => ({
  data: {
    data: rows,
    meta: { pagination: { page, pageSize: 500, pageCount: 1, total: rows.length } },
  },
});

describe("lectura paginada de personal de apoyo Senado", () => {
  it("acepta páginas JSON con registros y metadatos de paginación válidos", () => {
    const parsed = parseSenadoSupportPage(payload());
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.pagination).toMatchObject({ page: 1, pageCount: 1, total: 1 });
  });

  it("rechaza HTML presentado como una respuesta exitosa JSON", () => {
    expect(() => parseSenadoSupportPage("<!DOCTYPE html><html>bloqueado</html>")).toThrow("SENADO_SUPPORT_RESPONSE_NOT_JSON");
  });

  it("rechaza una estructura incompleta para no publicar una página truncada", () => {
    expect(() => parseSenadoSupportPage({ data: { data: [] } })).toThrow("SENADO_SUPPORT_PAGINATION_INVALID");
  });

  it("no acepta duplicados ni diferencias contra el total declarado por el origen", () => {
    const rows = [{ id: 7 }, { id: 7 }];
    expect(() => assertSenadoSupportCollection(rows, 2)).toThrow("SENADO_SUPPORT_DUPLICATE_ID");
    expect(() => assertSenadoSupportCollection([{ id: 8 }], 2)).toThrow("SENADO_SUPPORT_TOTAL_MISMATCH");
  });

  it("reintenta respuesta temporal HTML y devuelve la página válida", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response("<!doctype html>maintenance", { status: 200, headers: { "content-type": "text/html" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(payload()), { status: 200, headers: { "content-type": "application/json" } }));

    const result = await fetchSenadoSupportPage("https://senado.example/page", {
      fetchImpl,
      wait: async () => {},
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.pagination.total).toBe(1);
  });

  it("falla con un error acotado si el origen sigue entregando HTML", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("<!doctype html>blocked", {
      status: 200,
      headers: { "content-type": "text/html" },
    }));

    await expect(fetchSenadoSupportPage("https://senado.example/page", {
      fetchImpl,
      wait: async () => {},
      attempts: 2,
    })).rejects.toThrow("SENADO_SUPPORT_FETCH_FAILED");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
