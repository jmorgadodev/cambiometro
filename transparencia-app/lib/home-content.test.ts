import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalSourceId } from "./data-platform-d1";

const read = (path: string) => readFileSync(resolve(import.meta.dirname, "..", path), "utf8");

describe("portada editorial conectada a datos públicos", () => {
  const home = read("app/page.tsx");
  const searchCard = read("components/home/SearchBar.tsx");
  const search = read("components/HomeInlineSearch.tsx");
  const movements = read("components/home/MovementsTimeline.tsx");
  const votes = read("components/home/FeaturedVotes.tsx");
  const sources = read("components/home/SourcesCatalog.tsx");
  const globalStyles = read("app/globals.css");
  const homeStyles = read("app/home-editorial.css");

  it("mantiene el diseño separado del contrato de datos y sin ejemplos codificados", () => {
    expect(home).toContain("buildEditorialMovements(MOVIMIENTOS, MOVIMIENTOS_PIPELINE_METADATA.signals)");
    expect(home).toContain("buildEditorialVotes(getHomeFeaturedVotes(HOME_FEATURED_VOTE_IDS)");
    expect(home).toContain("buildEditorialChapters(operationalSources)");
    expect(movements).not.toContain("const LEAD_MOVEMENT");
    expect(votes).not.toContain("DEFAULT_VOTES");
    expect(sources).not.toContain("PILLAR_CHAPTERS");
    expect(searchCard).not.toContain("SEARCH_INDEX");
  });

  it("reutiliza el buscador real y conserva rutas públicas", () => {
    expect(searchCard).toContain("<HomeInlineSearch />");
    expect(search).toContain("publicApiUrl(`/api/v1/search?q=${encodeURIComponent(normalizedQuery)}`)");
    expect(search).toContain("searchStaticRemunerations(normalizedQuery)");
    expect(search).toContain("interleaveDistinctSearchResults(workerResults, remunerationResults)");
    expect(search).toContain('action="/remuneraciones-publicas/"');
    expect(searchCard).toContain('href: "/municipalidades"');
  });

  it("muestra cifras y estados del release, no números de la maqueta", () => {
    expect(home).toContain("GLOBAL_KPIS.registros_canonicos");
    expect(home).toContain("GLOBAL_KPIS.votaciones");
    expect(home).toContain("MOVIMIENTOS_HOME_SUMMARY.renuncias");
    expect(home).toContain("MOVIMIENTOS_PIPELINE_METADATA.last_success_at");
    expect(sources).not.toContain("SHA-256 verificado");
  });

  it("actualiza diariamente los días desde el último movimiento respaldado", () => {
    expect(home).toContain("ultimoCambioEfectivo={MOVIMIENTOS_HOME_SUMMARY.ultimoCambioEfectivo}");
    expect(movements).toContain("daysSinceCalendarDate(ultimoCambioEfectivo)");
    expect(movements).toContain("window.setInterval(actualizarDiasSinCambios, 60_000)");
  });

  it("conserva la identidad de los datasets parlamentarios", () => {
    expect(canonicalSourceId("votaciones_senado")).toBe("senado");
    expect(canonicalSourceId("gastos_camara")).toBe("camara");
  });

  it("aplica la maqueta sólo a la portada y evita textos internos", () => {
    expect(globalStyles).toContain("*:not(.home-desk, .home-desk *)");
    expect(homeStyles).toContain("body:has(.home-desk) .site-footer");
    expect(homeStyles).toContain("padding-bottom: 0;");
    expect(sources).not.toContain("Pipelines</span>");
    expect(sources).not.toContain("Intermediarios</span>");
  });
});
