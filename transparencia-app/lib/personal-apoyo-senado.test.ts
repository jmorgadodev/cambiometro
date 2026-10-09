import { describe, expect, it, vi } from "vitest";

const { getKvCache, staticDataset } = vi.hoisted(() => ({
  getKvCache: vi.fn(),
  staticDataset: {
    generado_en: "2026-10-08T11:13:15.793Z",
    diputados: {},
    senadores: {
      "MANUEL JOSE GARCIA GONZALEZ": [{ nombre: "OTRO REGISTRO" }],
      "OSSANDON IRARRAZABAL MANUEL JOSE": [{ nombre: "PEREZ CERDA NATALIA MAGALY", periodo: "2026-09", monto: 1_000_000 }],
    },
  },
}));

vi.mock("@/lib/db", () => ({ getKvCache }));
vi.mock("@/data/lake-subsets/personal-apoyo.subset.json", () => ({ default: staticDataset }));

import { personalApoyoParaSenador } from "./personal-apoyo";

describe("personal de apoyo del Senado", () => {
  it("prioriza el release estático R2 y el match de mayor coincidencia sobre el caché D1 antiguo", async () => {
    getKvCache.mockResolvedValue({ generado_en: "2026-01-01T00:00:00.000Z", senadores: {} });

    const result = await personalApoyoParaSenador("Manuel José Ossandón Irarrázabal");

    expect(result.registros).toEqual([
      expect.objectContaining({ nombre: "PEREZ CERDA NATALIA MAGALY", periodo: "2026-09", monto: 1_000_000 }),
    ]);
    expect(getKvCache).not.toHaveBeenCalled();
  });
});
