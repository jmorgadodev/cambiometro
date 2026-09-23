import { describe, expect, it } from "vitest";
import { buildEditorialChapters, buildEditorialMovements, buildEditorialVotes } from "./home-editorial-adapter";
import type { Movimiento } from "./movimientos";
import type { EtlSourceInfo } from "./etl-sources-data";
import type { VotacionAnual, VotacionDestacada } from "./votaciones-destacadas";

describe("portada editorial conectada al release", () => {
  it("elige los cambios publicados más recientes y conserva su nivel de evidencia", () => {
    const movements = [
      { id: "old", fecha: "2024-01-01", tipo_evento: "renuncia", cargo: "Cargo antiguo", organismo: "A", estado: "verificado", salio: { nombre: "Antiguo" }, fuentes: [] },
      { id: "press", fecha: "2026-09-14", tipo_evento: "renuncia", cargo: "Seremi", organismo: "B", estado: "corroborado", salio: { nombre: "Persona reciente" }, fuentes: [{ nivel: "prensa", medio: "Medio", url: "https://example.org", fecha: "2026-09-14", titulo: "Noticia" }] },
      { id: "official", fecha: "2026-09-01", tipo_evento: "nombramiento", cargo: "Subsecretaría", organismo: "C", estado: "verificado_oficial", entro: { nombre: "Persona anterior" }, fuentes: [{ nivel: "oficial", medio: "Diario Oficial", url: "https://example.org", fecha: "2026-09-01", titulo: "Decreto" }] },
    ] as Movimiento[];

    const cards = buildEditorialMovements(movements);
    expect(cards.map((card) => card.id)).toEqual(["press", "official"]);
    expect(cards[0]).toMatchObject({ title: "Renuncia de Persona reciente", status: "CORROBORADO", source: "Medio" });
    expect(cards[1]).toMatchObject({ title: "Nombramiento de Persona anterior", status: "VERIFICADO OFICIAL", source: "Diario Oficial" });
    expect(cards.every((card) => card.link.startsWith("/movimientos/"))).toBe(true);
  });

  it("usa el resumen y los votos nominales reales sin atribuir alineaciones políticas", () => {
    const selected = [{ votacion_id: "v-1", fecha: "2026-09-09", camara: "Senado", boletin: "123-26", titulo: "Proyecto público", resumen: "Resumen oficial publicado", resultado: "Aprobado", tags: [], fuente_url: "https://example.org" }] as VotacionDestacada[];
    const annual = [{ votacion_id: "v-1", votos: { favor: 25, contra: 0, abstencion: 0 }, quorum: null }] as VotacionAnual[];
    const cards = buildEditorialVotes(selected, annual);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ titulo: "Proyecto público", impactoCiudadano: "Resumen oficial publicado", votosFavor: 100, hasNominalVotes: true, veredicto: "Aprobado" });
    expect(cards[0].alineacionPolitica).toBeUndefined();
  });

  it("construye el catálogo sólo con fuentes presentes en el release", () => {
    const sources = [
      { id: "etl_chilecompra_ocds", name: "ChileCompra", category: "compras", organization: "ChileCompra", recordCount: 74142, frequency: "Mensual", statusText: "Disponible para consulta", viewLink: "/cruces", description: "Compras publicadas" },
      { id: "etl_senado_republica", name: "Senado", category: "parlamento", organization: "Congreso", recordCount: 8138, frequency: "Por publicación", statusText: "Universo verificado", viewLink: "/politico", description: "Votaciones" },
    ] as EtlSourceInfo[];
    const chapters = buildEditorialChapters(sources);
    expect(chapters.flatMap((chapter) => chapter.sources).map((source) => source.name)).toEqual(["ChileCompra", "Senado"]);
    expect(chapters.flatMap((chapter) => chapter.sources).some((source) => source.name === "Diario Oficial")).toBe(false);
    expect(chapters.find((chapter) => chapter.id === "dinero")?.totalRecords).toBe("74.142 registros");
  });
});
