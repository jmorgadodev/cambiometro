import { describe, expect, it } from "vitest";
import { getVotingFreshness, getVotacionDestacadaDetalle } from "./votaciones-destacadas";
import { bancadaDisensoPct, bancadaParticipacion, getVotacionBancadaShares, sortVotacionBancadas } from "./votaciones-bancada";

describe("votaciones destacadas", () => {
  it("distingue la fecha de revisión automática de la última votación nominal", () => {
    const freshness = getVotingFreshness();

    expect(freshness.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(freshness.latestVoteDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(freshness.reviewedAt!.slice(0, 10) >= freshness.latestVoteDate!).toBe(true);
    expect(freshness.totalSessions).toBeGreaterThan(0);
  });

  it("expone el padrón nominal, el resultado recalculado y el agrupamiento por bancada", () => {
    const detail = getVotacionDestacadaDetalle("camara-vot-89749");

    expect(detail).toBeDefined();
    expect(detail?.boletin).toBe("18210-06");
    expect(detail?.totales.efectivos).toBe(134);
    expect(detail?.totales.afirmativo).toBe(133);
    expect(detail?.resultadoRecalculado).toBe("Aprobado");
    expect(detail?.nominales).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          politico_id: "dip-123",
          nombre: "Lilian Betancurt Delgado",
        }),
      ]),
    );
    expect(detail?.bancadas.some((bancada) => bancada.sigla === "PDG")).toBe(true);
  });

  it("expone señales interpretables sin confundir padrón, participación y mayoría", () => {
    const detail = getVotacionDestacadaDetalle("camara-vot-89749");

    expect(detail?.analisis.participacionPct).toBe(
      Math.round((detail!.totales.efectivos / detail!.totales.padron) * 1000) / 10,
    );
    expect(detail?.analisis.opcionMayoritaria).toBe("Afirmativo");
    expect(detail?.analisis.mayoriaPct).toBe(
      Math.round((detail!.totales.afirmativo / detail!.totales.efectivos) * 1000) / 10,
    );
    expect(detail?.analisis.bancadasConMuestra).toBeGreaterThan(0);
    expect(detail?.bancadas.every((bancada) => bancada.opcionMayoritaria === null || bancada.disenso >= 0)).toBe(true);
  });

  it("normaliza la composición de cada bancada para una barra comparable", () => {
    const detail = getVotacionDestacadaDetalle("camara-vot-89749");
    const pdg = detail?.bancadas.find((bancada) => bancada.sigla === "PDG");

    expect(pdg).toBeDefined();
    const shares = getVotacionBancadaShares(pdg!);

    expect(shares.map((share) => share.key)).toEqual([
      "Afirmativo",
      "En Contra",
      "Abstención",
      "No Vota",
    ]);
    expect(shares.reduce((total, share) => total + share.value, 0)).toBe(pdg!.miembros);
    expect(shares.reduce((total, share) => total + share.pct, 0)).toBe(100);
    expect(shares.every((share) => share.pct >= 0 && share.pct <= 100)).toBe(true);
  });

  it("permite ordenar bancadas por participación y disenso sin mutar la fuente", () => {
    const detail = getVotacionDestacadaDetalle("camara-vot-89749");
    const source = detail!.bancadas;
    const originalOrder = source.map((party) => party.sigla);
    const byParticipation = sortVotacionBancadas(source, "participacion");
    const byDissent = sortVotacionBancadas(source, "disenso");

    expect(source).not.toBe(byParticipation);
    expect(byParticipation[0].efectivos / byParticipation[0].miembros).toBeGreaterThanOrEqual(
      bancadaParticipacion(byParticipation.at(-1)!),
    );
    expect(bancadaDisensoPct(byDissent[0])).toBeGreaterThanOrEqual(
      bancadaDisensoPct(byDissent.at(-1)!),
    );
    expect(source.map((party) => party.sigla)).toEqual(originalOrder);
  });
});
