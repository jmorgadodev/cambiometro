import { beforeEach, describe, expect, it, vi } from "vitest";

const { getKvCache } = vi.hoisted(() => ({ getKvCache: vi.fn() }));

vi.mock("@/lib/db", () => ({ getKvCache }));

describe("cargas KV concurrentes", () => {
  beforeEach(() => {
    vi.resetModules();
    getKvCache.mockReset();
  });

  it("comparte la proyección publicada de partidos sin consultar D1", async () => {
    const { getAllPartidosStats } = await import("@/lib/partido-estadisticas");

    const projections = await Promise.all(Array.from({ length: 30 }, () => getAllPartidosStats()));

    expect(projections.every((projection) => projection === projections[0])).toBe(true);
    expect(projections[0].rn.publication?.scope).toBe("catalogue-members");
    expect(getKvCache).not.toHaveBeenCalled();
  }, 15000);

  it("comparte una sola lectura del caché D1 de personal de apoyo", async () => {
    getKvCache.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { generado_en: "2026-08-13", fuentes: {}, meses_senado_disponibles: [], diputados: {}, senadores: {} };
    });
    const { leerPersonalApoyo } = await import("@/lib/personal-apoyo");

    await Promise.all(Array.from({ length: 155 }, () => leerPersonalApoyo()));

    expect(getKvCache).toHaveBeenCalledTimes(1);
    expect(getKvCache).toHaveBeenCalledWith("personal-apoyo.json");
  });
});
