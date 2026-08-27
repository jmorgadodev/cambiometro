import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCohesionRows } from "./cohesion-bancadas";
import { POLITICOS_SEED } from "./politicos-source";
import { PARTIDOS_SEED } from "./partidos";

describe("cohesión de bancadas", () => {
  it("recalcula el universo nominal y mantiene rangos", () => {
    const source = JSON.parse(readFileSync(new URL("../data/politicos-votaciones.json", import.meta.url), "utf8"));
    const rows = buildCohesionRows(POLITICOS_SEED, source, PARTIDOS_SEED);
    expect(Object.keys(source.sessions)).toHaveLength(769);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.votaciones_consideradas > 0 && row.cohesion_pct != null && row.cohesion_pct >= 0 && row.cohesion_pct <= 100)).toBe(true);
    expect(rows.every((row) => (row.miembros_promedio ?? 0) >= 2)).toBe(true);
  });
});
