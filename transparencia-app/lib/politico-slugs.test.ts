import { describe, it, expect } from "vitest";
import { POLITICOS_SEED } from "./seed-politicos";
import {
  slugifyNombre,
  getPoliticoSlug,
  getPoliticoByIdOrSlug,
  isLegacyPoliticoId,
  POLITICO_SLUG_MAP,
} from "./politico-slugs";

describe("politico-slugs", () => {
  it("genera slugs URL-safe y normalizados sin caracteres inválidos", () => {
    expect(slugifyNombre("Miguel Becker Alvear")).toBe("miguel-becker-alvear");
    expect(slugifyNombre("Carmen Gloria Aravena Acuña")).toBe("carmen-gloria-aravena-acuna");
    expect(slugifyNombre("Vanessa Kaiser Barents-Von Hohenhagen")).toBe("vanessa-kaiser-barents-von-hohenhagen");
    expect(slugifyNombre("José Miguel Castro Bascuñán")).toBe("jose-miguel-castro-bascunan");
  });

  it("garantiza 205 slugs únicos para los 205 parlamentarios del seed", () => {
    expect(POLITICOS_SEED.length).toBe(205);
    expect(POLITICO_SLUG_MAP.size).toBe(205);

    const slugs = POLITICOS_SEED.map((p) => getPoliticoSlug(p));
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(205);
  });

  it("identifica IDs legados correctamente con isLegacyPoliticoId", () => {
    expect(isLegacyPoliticoId("sen-001")).toBe(true);
    expect(isLegacyPoliticoId("dip-061")).toBe(true);
    expect(isLegacyPoliticoId("sen-035")).toBe(true);
    expect(isLegacyPoliticoId("miguel-becker-alvear")).toBe(false);
    expect(isLegacyPoliticoId("carmen-gloria-aravena-acuna")).toBe(false);
  });

  it("resuelve políticos tanto por ID legado como por slug nuevo", () => {
    const firstPol = POLITICOS_SEED[0];
    const expectedSlug = getPoliticoSlug(firstPol);

    const polById = getPoliticoByIdOrSlug(firstPol.id);
    expect(polById).toBeDefined();
    expect(polById?.nombre_completo).toBe(firstPol.nombre_completo);

    const polBySlug = getPoliticoByIdOrSlug(expectedSlug);
    expect(polBySlug).toBeDefined();
    expect(polBySlug?.id).toBe(firstPol.id);
    expect(polBySlug?.nombre_completo).toBe(firstPol.nombre_completo);
  });

  it("getPoliticoSlug funciona pasando objeto o ID legado o slug", () => {
    const firstPol = POLITICOS_SEED[0];
    const expectedSlug = getPoliticoSlug(firstPol);

    expect(getPoliticoSlug(firstPol)).toBe(expectedSlug);
    expect(getPoliticoSlug(firstPol.id)).toBe(expectedSlug);
    expect(getPoliticoSlug(expectedSlug)).toBe(expectedSlug);
  });
});
