import { beforeEach, describe, expect, it, vi } from "vitest";

const { getKvCache } = vi.hoisted(() => ({ getKvCache: vi.fn() }));

vi.mock("@/lib/db", () => ({ getKvCache }));

describe("cargas KV concurrentes", () => {
  beforeEach(() => {
    vi.resetModules();
    getKvCache.mockReset();
  });

  it("comparte una sola lectura para las estadisticas de todos los partidos", async () => {
    getKvCache.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return {};
    });
    const { getPartidoEstadisticas } = await import("@/lib/partido-estadisticas");

    await Promise.all(Array.from({ length: 30 }, (_, index) => getPartidoEstadisticas(`p-${index}`)));

    expect(getKvCache).toHaveBeenCalledTimes(1);
    expect(getKvCache).toHaveBeenCalledWith("partidos-stats.json");
  }, 15000);

  it("comparte una sola lectura para el personal de apoyo de todos los diputados", async () => {
    getKvCache.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { generado_en: "2026-08-13", fuentes: {}, meses_senado_disponibles: [], diputados: {}, senadores: {} };
    });
    const { personalApoyoParaDiputado } = await import("@/lib/personal-apoyo");

    await Promise.all(Array.from({ length: 155 }, (_, index) => personalApoyoParaDiputado(String(index + 1))));

    expect(getKvCache).toHaveBeenCalledTimes(1);
    expect(getKvCache).toHaveBeenCalledWith("personal-apoyo.json");
  });
});
