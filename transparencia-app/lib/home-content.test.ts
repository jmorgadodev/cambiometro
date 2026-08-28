import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalSourceId } from "./data-platform-d1";

describe("promesas editoriales del inicio", () => {
  const home = readFileSync(resolve(import.meta.dirname, "../app/page.tsx"), "utf8");

  it("no promete una nomina nacional ni cifras decorativas sin respaldo", () => {
    expect(home).not.toContain("+400");
    expect(home).not.toContain("Cobertura Territorial");
    expect(home).not.toContain("nómina completa del Estado");
  });

  it("calcula los indicadores desde la plataforma canonica", () => {
    expect(home).toContain("GLOBAL_KPIS.votaciones");
    expect(home).toContain("GLOBAL_KPIS.gastos");
    expect(home).toContain("GLOBAL_KPIS.relaciones");
  });

  it("agrupa datasets parlamentarios bajo su institucion", () => {
    expect(canonicalSourceId("votaciones_senado")).toBe("senado");
    expect(canonicalSourceId("gastos_camara")).toBe("camara");
    expect(canonicalSourceId("contraloria")).toBe("contraloria");
  });

  it("envía la búsqueda del inicio al directorio parlamentario", () => {
    expect(home).toContain('<form className="home-query" action="/politico" role="search">');
    expect(home).toContain('placeholder="Nombre, partido, distrito o región"');
    expect(home).toContain("diputados y senadores");
  });

  it("mantiene cinco preguntas de análisis y hace visible el seguimiento de movimientos", () => {
    expect(home).toContain("¿Qué movimientos se han informado?");
    expect(home).toContain('href="/movimientos"');
    expect(home).toContain("home-path--movement");
  });

  it("presenta el alcance histórico de las votaciones sin reducirlo al corte actual", () => {
    expect(home).toContain("Votaciones de sala históricas");
    expect(home).toContain("Cámara + Senado · 2022–2026");
  });
});
