import { describe, expect, it } from "vitest";
import { POLITICOS_SEED } from "./seed-politicos";
import {
  CAMBIOS_VERIFICADOS,
  getPoliticoPath,
} from "./public-changes";
import { getPlatformStats } from "./platform-data";
import { getPoliticoSlug } from "./politico-slugs";

describe("datos compartidos de la plataforma", () => {
  it("deriva las métricas visibles desde las colecciones canónicas", () => {
    const stats = getPlatformStats();

    expect(stats.autoridades).toBe(POLITICOS_SEED.length);
    expect(stats.municipalidades).toBeGreaterThan(0);
    expect(stats.funcionarios).toBeGreaterThan(0);
    expect(stats.servicios).toBeGreaterThan(0);
  });

  it("mantiene cada novedad conectada a una ficha política existente", () => {
    const ids = new Set(POLITICOS_SEED.map((politico) => politico.id));

    for (const cambio of CAMBIOS_VERIFICADOS) {
      const politico = POLITICOS_SEED.find((item) => item.id === cambio.politicoId);

      expect(ids.has(cambio.politicoId)).toBe(true);
      expect(cambio.politico).toBe(politico?.nombre_completo);
      expect(cambio.partidoId).toBe(politico?.partido_id);
      expect(cambio.votos2025).toBe(politico?.votos_2025);
      expect(cambio.porcentajeVotos).toBe(politico?.porcentaje_votos);
      expect(getPoliticoPath(cambio.politicoId)).toBe(`/politico/${getPoliticoSlug(cambio.politicoId)}`);
      expect(cambio.fechaIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
