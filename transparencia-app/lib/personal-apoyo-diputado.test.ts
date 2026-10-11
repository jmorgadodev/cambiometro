import { describe, expect, it, vi } from "vitest";

const { getKvCache, existsSync, readFileSync } = vi.hoisted(() => {
  const diputado = {
    meses: [{ num: "09", nombre: "Septiembre" }],
    mes_personal: "septiembre 2026",
    ficha: { comunas_distrito: null, numero_distrito: null, region: null, periodo: null, partido: null, bancada: null, foto: null, redes: {} },
    personal_apoyo: [{ tipo: "Contrato", nombre: "PERSONA DE PRUEBA", cargo: "Asesor", sueldo: 100_000 }],
  };
  return {
    getKvCache: vi.fn(),
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn((file) => JSON.stringify(String(file).includes("lake-subsets")
      ? { diputados: {}, senadores: {} }
      : { diputados: { "1198": diputado }, senadores: {} })),
  };
});

vi.mock("@/lib/db", () => ({ getKvCache }));
vi.mock("fs", () => ({ default: { existsSync, readFileSync } }));

import { personalApoyoParaDiputado } from "./personal-apoyo";

describe("personal de apoyo de Cámara", () => {
  it("muestra el diputado 1198 desde el release completo aunque falte en el subset y D1 sea antiguo", async () => {
    getKvCache.mockResolvedValue({ diputados: {}, senadores: {} });

    const result = await personalApoyoParaDiputado("1198");

    expect(result.n_personas).toBe(1);
    expect(result.diputado?.mes_personal).toBe("septiembre 2026");
    expect(result.diputado?.personal_apoyo[0]?.nombre).toBe("PERSONA DE PRUEBA");
    expect(getKvCache).not.toHaveBeenCalled();
  });
});
