import { describe, it, expect } from "vitest";
import { COALICION_POR_PARTIDO } from "./partido-electoral-data";

describe("coaliciones 2026 — gobierno Kast desde 11-03-2026", () => {
  it("oficialismo incluye REP/RN/UDI/PDG tras inversión", () => {
    expect(COALICION_POR_PARTIDO.rep.coalicion).toBe("Oficialismo");
    expect(COALICION_POR_PARTIDO.rn.coalicion).toBe("Oficialismo");
    expect(COALICION_POR_PARTIDO.udi.coalicion).toBe("Oficialismo");
    expect(COALICION_POR_PARTIDO.pdg.coalicion).toBe("Oficialismo");
  });

  it("bloque frenteamplista/socialista es oposición tras inversión", () => {
    expect(COALICION_POR_PARTIDO.fa.coalicion).toBe("Oposición");
    expect(COALICION_POR_PARTIDO.ps.coalicion).toBe("Oposición");
    expect(COALICION_POR_PARTIDO.pc.coalicion).toBe("Oposición");
    expect(COALICION_POR_PARTIDO.ppd.coalicion).toBe("Oposición");
    expect(COALICION_POR_PARTIDO.pdc.coalicion).toBe("Oposición");
    expect(COALICION_POR_PARTIDO.pl.coalicion).toBe("Oposición");
    expect(COALICION_POR_PARTIDO.pr.coalicion).toBe("Oposición");
    expect(COALICION_POR_PARTIDO.frvs.coalicion).toBe("Oposición");
  });

  it("independientes permanece independiente", () => {
    expect(COALICION_POR_PARTIDO.ind.coalicion).toBe("Independientes");
  });

  it("Demócratas/Amarillos/Evópoli son oficialismo con fuente dura (gabinete Kast 02-02-2026)", () => {
    expect(COALICION_POR_PARTIDO.dem.coalicion).toBe("Oficialismo");
    expect(COALICION_POR_PARTIDO.ama.coalicion).toBe("Oficialismo");
    expect(COALICION_POR_PARTIDO.evopoli.coalicion).toBe("Oficialismo");
  });
});
