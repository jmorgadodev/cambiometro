import { describe, expect, it, vi } from "vitest";

const { getKvCache, subsetDataset, fullDataset, existsSync, readFileSync } = vi.hoisted(() => {
  const subsetDataset = {
    generado_en: "2026-10-08T11:13:15.793Z",
    diputados: {},
    senadores: {
      "MANUEL JOSE GARCIA GONZALEZ": [{ nombre: "OTRO REGISTRO" }],
      "OSSANDON IRARRAZABAL MANUEL JOSE": [{ nombre: "PEREZ CERDA NATALIA MAGALY", periodo: "2026-09", monto: 1_000_000 }],
    },
  };
  const fullDataset = {
    ...subsetDataset,
    senadores: {
      ...subsetDataset.senadores,
      "SENADOR AUSENTE DEL SUBSET": [{ nombre: "REGISTRO COMPLETO", periodo: "2026-09", monto: 2_000_000 }],
    },
  };
  return {
    getKvCache: vi.fn(),
    subsetDataset,
    fullDataset,
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn((file) => JSON.stringify(String(file).includes("lake-subsets") ? subsetDataset : fullDataset)),
  };
});

vi.mock("@/lib/db", () => ({ getKvCache }));
vi.mock("fs", () => ({ default: { existsSync, readFileSync } }));

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

  it("recupera desde el dataset completo los senadores que no están en el subset", async () => {
    getKvCache.mockResolvedValue(null);

    const result = await personalApoyoParaSenador("Senador Ausente del Subset");

    expect(result.registros).toEqual([
      expect.objectContaining({ nombre: "REGISTRO COMPLETO", periodo: "2026-09", monto: 2_000_000 }),
    ]);
    expect(getKvCache).not.toHaveBeenCalled();
  });
});
