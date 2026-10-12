import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ getKvCache: vi.fn() }));

import { camaraHistoricalTransparencyForPolitician, type PersonalApoyoDataset } from "@/lib/personal-apoyo";

describe("transparencia histórica de Cámara en fichas actuales", () => {
  it("vincula a Renzo Trisotti por su identidad oficial y conserva el rótulo del período anterior", () => {
    const section = {
      status: "available" as const,
      period: "febrero 2026",
      retrieved_at: "2026-10-12T00:00:00.000Z",
      source_url: "https://www.camara.cl/transparencia/asesoriasexternasgral.aspx",
      rows: [{ values: { Folio: "2", Asesor: "Asesor", Monto: "200.000" }, sourceLinks: [] }],
      periods: [{
        period: "febrero 2026",
        status: "available" as const,
        retrieved_at: "2026-10-12T00:00:00.000Z",
        rows: [{ values: { Folio: "2", Asesor: "Asesor", Monto: "200.000" }, sourceLinks: [] }],
      }],
    };
    const dataset = { diputados: { "1003": { transparencia_camara: { asesorias_externas: section } } } } as unknown as PersonalApoyoDataset;

    expect(camaraHistoricalTransparencyForPolitician("Renzo Trisotti Martínez", dataset)).toMatchObject({
      deputyId: "1003",
      legislativePeriod: "2022-2026",
      sections: { asesorias_externas: { periods: [{ period: "febrero 2026" }] } },
    });
    expect(camaraHistoricalTransparencyForPolitician("Nombre sin correspondencia", dataset)).toBeNull();
  });

  it("lee los cortes disponibles para mostrar los meses en la ficha de Renzo", () => {
    const periods = ["enero 2026", "febrero 2026"].map((period) => ({
      period,
      status: "available" as const,
      retrieved_at: "2026-10-12T00:00:00.000Z",
      rows: [{ values: { Folio: "2", Asesor: "Asesor", Monto: "200.000" }, sourceLinks: [] }],
    }));
    const section = {
      status: "available" as const,
      period: "febrero 2026",
      retrieved_at: "2026-10-12T00:00:00.000Z",
      source_url: "https://www.camara.cl/transparencia/asesoriasexternasgral.aspx",
      rows: periods[1].rows,
      periods,
    };
    const dataset = { diputados: { "1003": { transparencia_camara: { asesorias_externas: section } } } } as unknown as PersonalApoyoDataset;
    const result = camaraHistoricalTransparencyForPolitician("Renzo Trisotti Martínez", dataset);

    expect(result?.deputyId).toBe("1003");
    expect(result?.sections.asesorias_externas?.periods?.map(({ period }) => period)).toEqual([
      "enero 2026",
      "febrero 2026",
    ]);
  });
});
