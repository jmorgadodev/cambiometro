import { describe, expect, it } from "vitest";
import { getVotacionDestacadaDetalle } from "./votaciones-destacadas";

describe("votaciones destacadas", () => {
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
});
