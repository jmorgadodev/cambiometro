import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { tituloVotacionLegible } from "./votaciones-format";

describe("interfaz de votaciones destacadas", () => {
  const client = readFileSync(resolve(import.meta.dirname, "../components/VotacionesDestacadasClient.tsx"), "utf8");
  const annualExplorer = readFileSync(resolve(import.meta.dirname, "../components/VotacionesAnualesExplorer.tsx"), "utf8");

  it("deja la ruta como registro completo y mantiene los filtros en el explorador anual", () => {
    const page = readFileSync(resolve(import.meta.dirname, "../app/votaciones-destacadas/page.tsx"), "utf8");
    expect(page).toContain('title: "Votaciones parlamentarias — El Cambiómetro"');
    expect(client).toContain("Votaciones parlamentarias");
    expect(client).toContain("VotacionesAnualesExplorer");
    expect(client).not.toContain('aria-label="Filtros de votaciones destacadas"');
    expect(client).not.toContain("Decisiones que merecen contexto");
  });

  it("muestra las 769 votaciones del año con búsqueda y paginación", () => {
    const page = readFileSync(resolve(import.meta.dirname, "../app/votaciones-destacadas/page.tsx"), "utf8");
    expect(page).toContain("getVotacionesAnuales");
    expect(annualExplorer).toContain("Todas las votaciones de 2026");
    expect(annualExplorer).toContain("VOTING_PAGE_SIZE");
    expect(annualExplorer).toContain("Buscar por materia o boletín");
    expect(annualExplorer).toContain("getVotacionReadableUrl(entry)");
    expect(annualExplorer).toContain("Consultar detalle oficial de esta votación ↗");
    expect(annualExplorer).toContain("El registro estructurado no describe la materia");
    expect(annualExplorer).not.toContain("href={entry.tramite_url ?? entry.fuente_url}");
    expect(annualExplorer).toContain("El boletín identifica el expediente legislativo");
  });

  it("no presenta etiquetas 1-Otros como materia ni expone enlaces XML", () => {
    const history = readFileSync(resolve(import.meta.dirname, "../components/VotacionesHistorial.tsx"), "utf8");
    const readableUrl = readFileSync(resolve(import.meta.dirname, "./votaciones-readable-url.ts"), "utf8");
    expect(history).toContain("Votación clasificada en «Otros»");
    expect(history).toContain("no informa aquí la materia ni un boletín asociado");
    expect(history).toContain("Votación asociada al expediente legislativo");
    expect(history).toContain("Expediente legislativo · Boletín N°");
    expect(history).toContain("getVotacionReadableUrl({");
    expect(history).toContain("Ver ficha oficial de esta votación");
    expect(history).toContain("Consultar detalle oficial: materia y resultado ↗");
    expect(history).toContain('from "@/lib/votaciones-readable-url"');
    expect(annualExplorer).toContain('from "@/lib/votaciones-readable-url"');
    expect(client).toContain('from "@/lib/votaciones-readable-url"');
    expect(readableUrl).not.toMatch(/node:(?:fs|path)/);
    expect(history).not.toContain("Votación de procedimiento de Sala");
    expect(history).not.toContain("Dato estructurado original (XML)");
    expect(client).toContain("getVotacionReadableUrl(detail)");
    expect(client).not.toContain("href={detail.fuente_url}");
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

  it("explica la ficha y enlaza la tramitación oficial cuando existe", () => {
    expect(client).toContain("Ver tramitación oficial del proyecto ↗");
    expect(client).toContain("Etapa registrada:");
    expect(readFileSync(resolve(import.meta.dirname, "./votaciones-destacadas.ts"), "utf8")).toContain("tramiteUrl: session.url_tramitacion ?? null");
  });

  it("explica por separado la revisión del pipeline y la última votación", () => {
    const page = readFileSync(resolve(import.meta.dirname, "../components/home/FeaturedVotes.tsx"), "utf8");
    expect(page).toContain("Última revisión");
    expect(page).toContain("Última votación de sala");
    expect(client).toContain("Última revisión automática");
    expect(client).toContain("Última votación nominal");
  });
});
