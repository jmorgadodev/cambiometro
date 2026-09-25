import { describe, expect, it } from "vitest";
import { buildEditorialChapters, buildEditorialMovements, buildEditorialVotes, buildLatestSenateVotes, composeHomeFeaturedVotes } from "./home-editorial-adapter";
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

  it("combina una votación importante con las dos votaciones más recientes del Senado desde R2", () => {
    const latestSenateVotes = buildLatestSenateVotes([
      { id: "r2-11352", kind: "vote", sourceId: "votaciones_senado", occurredAt: "2026-09-23", evidence: { sourceUrl: "https://senado.cl/11352" }, data: { id: "sen-vot-11352", fecha_original: "23-09-2026 19:30:00", descripcion: "Votación del Senado 11352", resultado: "Aprobado", boletin: "12345-67", total_si: "18", total_no: "2", total_abstencion: "1", quorum: "Mayoría simple", url: "https://senado.cl/11352" } },
      { id: "r2-11354", kind: "vote", sourceId: "votaciones_senado", occurredAt: "2026-09-23", evidence: { sourceUrl: "https://senado.cl/11354" }, data: { id: "sen-vot-11354", fecha_original: "23-09-2026 19:50:00", descripcion: "Votación del Senado 11354", resultado: "Aprobado", boletin: "12345-69", total_si: "20", total_no: "1", total_abstencion: "0", quorum: "Mayoría simple", url: "https://senado.cl/11354" } },
      { id: "r2-11353", kind: "vote", sourceId: "votaciones_senado", occurredAt: "2026-09-23", evidence: { sourceUrl: "https://senado.cl/11353" }, data: { id: "sen-vot-11353", fecha_original: "23-09-2026 19:45:00", descripcion: "Votación del Senado 11353", resultado: "Rechazado", boletin: "12345-68", total_si: "7", total_no: "12", total_abstencion: "1", quorum: "Mayoría simple", url: "https://senado.cl/11353" } },
      { id: "r2-camara", kind: "vote", sourceId: "votaciones_camara", occurredAt: "2026-09-24", data: { id: "camara-vot-90000", fecha: "2026-09-24", descripcion: "No es una votación del Senado", resultado: "Aprobado" } },
    ]);
    const important = [{ id: "votacion-importante", camara: "Senado", fecha: "19 AGO 2026", boletin: "BOLETÍN 18302-11", etapa: "Votación de sala", dilemaCivico: "SALUD", titulo: "Acceso a alimentos libres de gluten", impactoCiudadano: "Proyecto importante", veredicto: "Aprobado", veredictoTipo: "aprobado", quorumExplicado: "Mayoría simple", votosFavor: 100, votosContra: 0, votosAbstencion: 0, hasNominalVotes: true, link: "/votaciones-destacadas/?votacion=senado-vot-11264" }] as const;

    const homepageVotes = composeHomeFeaturedVotes(important, latestSenateVotes);

    expect(latestSenateVotes.map((vote) => vote.id)).toEqual(["sen-vot-11354", "sen-vot-11353"]);
    expect(homepageVotes.map((vote) => vote.id)).toEqual(["sen-vot-11354", "votacion-importante", "sen-vot-11353"]);
    expect(homepageVotes[0]).toMatchObject({ camara: "Senado", titulo: "Votación del Senado 11354", link: "https://senado.cl/11354" });
    expect(homepageVotes[2]).toMatchObject({ veredicto: "Rechazado", votosFavor: 35, votosContra: 60, votosAbstencion: 5 });
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
