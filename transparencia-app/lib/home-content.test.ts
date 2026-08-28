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

  it("mantiene cinco preguntas de análisis y resume el seguimiento de movimientos", () => {
    expect(home).toContain("¿Qué cambió desde el 11 de marzo?");
    expect(home).toContain("MOVIMIENTOS_HOME_SUMMARY.renuncias");
    expect(home).toContain("MOVIMIENTOS_HOME_SUMMARY.enConfirmacion");
    expect(home).toContain('href="/movimientos"');
    expect(home).toContain("home-path--movement");
  });

  it("usa una selección editorial estable y muestra el resumen factual de cada votación", () => {
    expect(home).toContain("HOME_FEATURED_VOTE_IDS");
    expect(home).toContain("impacto público, quórum relevante");
    expect(home).toContain("{vote.resumen}");
    expect(home).toContain('"senado-vot-11264"');
    expect(home).toContain('"camara-vot-89844"');
  });

  it("presenta el alcance histórico de las votaciones sin reducirlo al corte actual", () => {
    expect(home).toContain("Votaciones de sala históricas");
    expect(home).toContain("Cámara + Senado · 2022–2026");
  });

  it("centra el bloque central de las fuentes y conserva las bandas laterales", () => {
    const styles = readFileSync(resolve(import.meta.dirname, "../app/globals.css"), "utf8");
    expect(styles).toContain(".home-source-card h3 { margin: 1.35rem 0 .25rem; color: var(--text-1); font-size: .95rem; font-weight: 750; letter-spacing: -.02em; line-height: 1.2; text-align: center; }");
    expect(styles).toContain(".home-source-card p { min-height: 2.2em; margin: 0; overflow: hidden; color: var(--text-2); font-size: .72rem; line-height: 1.45; text-align: center; text-overflow: ellipsis; }");
    expect(styles).toContain(".home-source-card__metric { display: flex; align-items: baseline; justify-content: center; gap: .4rem; margin-top: 1.15rem; }");
    expect(styles).toContain(".home-source-card__top, .home-source-card__footer { display: flex; align-items: center; justify-content: space-between;");
  });
});
