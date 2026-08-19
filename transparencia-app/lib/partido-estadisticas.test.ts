import { describe, it, expect } from "vitest";
import {
  getAllPartidosSummary,
  politicosDelPartido,
  escañosDelPartido,
  getPartidoEstadisticas,
  normalizePartidoId,
  votacionesDelPartido,
  asistenciaPorSesion,
} from "./partido-estadisticas";
import { getPartidoConfig, PARTIDOS_CONFIG } from "./partidos.config";

describe("partido-estadisticas", () => {
  it("normaliza alias de partidos políticos e independientes", () => {
    expect(normalizePartidoId("IND")).toBe("ind");
    expect(normalizePartidoId("independientes")).toBe("ind");
    expect(normalizePartidoId("Republicanos")).toBe("rep");
    expect(normalizePartidoId("UDI")).toBe("udi");
  });

  it("resuelve branding e identidad institucional SERVEL", () => {
    const rn = getPartidoConfig("RN");
    expect(rn.sigla).toBe("RN");
    expect(rn.color_oficial).toBe("#002F6C");
    expect(rn.logo_url).toBeDefined();

    const udi = getPartidoConfig("udi");
    expect(udi.sigla).toBe("UDI");
    expect(udi.color_oficial).toBe("#004EA2");
  });

  it("calcula escaños reales de partidos y de independientes", async () => {
    const rep = escañosDelPartido("rep");
    expect(rep.total).toBeGreaterThan(0);
    expect(rep.diputados + rep.senadores).toBe(rep.total);

    const ind = escañosDelPartido("ind");
    expect(ind.total).toBeGreaterThan(0);
  });

  it("entrega resumen completo de partidos con escaños, votos y gastos", async () => {
    const resumen = await getAllPartidosSummary();
    expect(resumen.length).toBeGreaterThan(5);

    // Debe incluir los partidos principales
    const siglas = resumen.map((p) => p.sigla);
    expect(siglas).toContain("REP");
    expect(siglas).toContain("UDI");
    expect(siglas).toContain("RN");
    expect(siglas).toContain("PS");
    expect(siglas).toContain("IND");

    // Independientes debe estar marcado como categoría especial
    const indResumen = resumen.find((p) => p.id === "ind");
    expect(indResumen).toBeDefined();
    expect(indResumen?.esIndependiente).toBe(true);
  });

  it("obtiene estadísticas de votos y gastos con desglose nominal para un partido", async () => {
    const stats = await getPartidoEstadisticas("rn");
    expect(stats).toBeDefined();
    expect(stats?.votosCamara).toBeDefined();
    expect(stats?.gastos).toBeDefined();

    const votaciones = await votacionesDelPartido("rn", 20);
    expect(votaciones.length).toBeGreaterThan(5);
    expect(votaciones[0].votosNominales).toBeDefined();
    expect(votaciones[0].votosNominales?.length).toBeGreaterThan(0);

    const asistencia = await asistenciaPorSesion("rn");
    expect(asistencia.length).toBeGreaterThan(0);
    expect(asistencia[0].presentes).toBeDefined();
    expect(asistencia[0].total).toBeDefined();
  });
});

