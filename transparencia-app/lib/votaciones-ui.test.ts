import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { tituloVotacionLegible } from "./votaciones-format";
import { getReadableOfficialVoteUrl, latestAvailableVoteDate, mergePoliticianVoteRows, tituloVotacionPerfilLegible } from "./votaciones-presentation";

describe("interfaz de votaciones destacadas", () => {
  const client = readFileSync(resolve(import.meta.dirname, "../components/VotacionesDestacadasClient.tsx"), "utf8");
  const annualExplorer = readFileSync(resolve(import.meta.dirname, "../components/VotacionesAnualesExplorer.tsx"), "utf8");
  const integration = readFileSync(resolve(import.meta.dirname, "../scripts/verify-integration.mjs"), "utf8");
  const profileHistory = readFileSync(resolve(import.meta.dirname, "../components/VotacionesHistorial.tsx"), "utf8");

  it("deja la ruta como registro completo y mantiene los filtros en el explorador anual", () => {
    const page = readFileSync(resolve(import.meta.dirname, "../app/votaciones-destacadas/page.tsx"), "utf8");
    expect(page).toContain('title: "Votaciones parlamentarias — El Cambiómetro"');
    expect(client).toContain("Votaciones parlamentarias");
    expect(client).toContain("VotacionesAnualesExplorer");
    expect(client).not.toContain('aria-label="Filtros de votaciones destacadas"');
    expect(client).not.toContain("Decisiones que merecen contexto");
  });

  it("muestra las votaciones incorporadas del año con búsqueda y paginación", () => {
    const page = readFileSync(resolve(import.meta.dirname, "../app/votaciones-destacadas/page.tsx"), "utf8");
    expect(page).toContain("getVotacionesAnuales");
    expect(annualExplorer).toContain("Votaciones incorporadas en 2026");
    expect(annualExplorer).toContain("VOTING_PAGE_SIZE");
    expect(annualExplorer).toContain("Buscar por materia o boletín");
  });

  it("no presenta el catálogo publicado como un padrón nominal completo", () => {
    expect(annualExplorer).toContain("Catálogo de votaciones incorporadas");
    expect(annualExplorer).toContain("Votaciones incorporadas en 2026");
    expect(annualExplorer).not.toContain("Registro nominal completo");
    expect(annualExplorer).not.toContain("Consulta todas las votaciones publicadas por cada corporación");
  });

  it("el E2E busca el título actual del catálogo anual", () => {
    expect(integration).toContain('name: "Votaciones incorporadas en 2026"');
    expect(integration).not.toContain('name: "Todas las votaciones de 2026"');
  });

  it("permite abrir desde la home el análisis de cada votación destacada", () => {
    const page = readFileSync(resolve(import.meta.dirname, "../components/home/FeaturedVotes.tsx"), "utf8");
    const adapter = readFileSync(resolve(import.meta.dirname, "./home-editorial-adapter.ts"), "utf8");
    expect(page).toContain("href={vote.link}");
    expect(adapter).toContain("?votacion=${encodeURIComponent(vote.votacion_id)}");
    expect(client).toContain("new URLSearchParams(window.location.search)");
  });

  it("describe el boletín sin repetir una etiqueta genérica como título", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./votaciones-format.ts"), "utf8");
    expect(source).toContain('"Votación de proyecto"');
    expect(source).toContain("Boletín N°");
    expect(tituloVotacionLegible({ titulo: "Votación registrada del Boletín N° 17324-33", boletin: "17324-33" }, "Proyecto de Ley"))
      .toBe("Proyecto de Ley · Boletín N° 17324-33");
  });

  it("prioriza la fuente oficial legible y no expone enlaces XML en la interfaz", () => {
    expect(profileHistory).toContain("Consultar votaciones de Sala en la Cámara ↗");
    expect(profileHistory).not.toContain("Dato estructurado original (XML)");
    expect(annualExplorer).not.toContain("Dato estructurado original (XML)");
    expect(client).toContain("Etapa registrada:");
    expect(readFileSync(resolve(import.meta.dirname, "./votaciones-destacadas.ts"), "utf8")).toContain("tramiteUrl: session.url_tramitacion ?? null");
  });

  it("explica boletín y resultado para lectura ciudadana", () => {
    expect(profileHistory).toContain("el boletín es el número que identifica un proyecto");
    expect(annualExplorer).toContain("no necesariamente que la ley ya esté vigente");
  });

  it("explica por separado la revisión del pipeline y la última votación", () => {
    const page = readFileSync(resolve(import.meta.dirname, "../components/home/FeaturedVotes.tsx"), "utf8");
    expect(page).toContain("Última revisión");
    expect(page).toContain("Última votación de sala");
    expect(client).toContain("Última revisión automática");
    expect(client).toContain("Última votación incorporada");
    expect(client).not.toContain("votaciones verificadas");
  });

  it("conserva el historial disponible aunque falte el corte más reciente y prioriza la fila canónica", () => {
    const slice = [
      { votacion: { id: "v1", fecha: "2026-09-20", descripcion: "Voto anterior" }, voto: { opcion: "A favor" } },
      { votacion: { id: "v2", fecha: "2026-09-23", descripcion: "Versión antigua" }, voto: { opcion: "En contra" } },
    ];
    const current = [
      { votacion: { id: "v2", fecha: "2026-09-23", descripcion: "Versión canónica" }, voto: { opcion: "A favor" } },
    ];
    const merged = mergePoliticianVoteRows(slice, current);

    expect(merged.map((row) => row.votacion.id)).toEqual(["v2", "v1"]);
    expect(merged[0].votacion.descripcion).toBe("Versión canónica");
    expect(latestAvailableVoteDate(merged)).toBe("2026-09-23");
  });

  it("enlaza a una página oficial legible, no a un archivo estructurado", () => {
    expect(getReadableOfficialVoteUrl("Cámara", "https://opendata.camara.cl/voto.xml", "https://www.senado.cl/tramitacion"))
      .toBe("https://www.camara.cl/legislacion/sala_sesiones/votaciones.aspx");
    expect(getReadableOfficialVoteUrl("Senado", "https://www.senado.cl/actividad/sala", null))
      .toBe("https://www.senado.cl/actividad/sala");
  });

  it("no confunde proyectos de resolución o acuerdo con proyectos de ley", () => {
    expect(tituloVotacionPerfilLegible("Resolución", "Proyecto de Resolución", "12345-06"))
      .toBe("Proyecto de Resolución · Boletín N° 12345-06");
    expect(tituloVotacionPerfilLegible("Proyecto de ley", "Proyecto de Acuerdo", "12345-06"))
      .toBe("Proyecto de Acuerdo · Boletín N° 12345-06");
  });
});
