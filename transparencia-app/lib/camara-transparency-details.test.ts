import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CamaraTransparencyDetails } from "@/components/politico/CamaraTransparencyDetails";

const section = {
  status: "available" as const,
  period: "septiembre 2026",
  retrieved_at: "2026-10-10T00:00:00.000Z",
  source_url: "https://www.camara.cl/transparencia/asesoriasexternasgral.aspx",
  rows: [{ values: { Folio: "9", Asesor: "Consultora A", Monto: "400.000" }, sourceLinks: [] }],
  periods: [
    { period: "marzo 2026", status: "available" as const, retrieved_at: "2026-10-10T00:00:00.000Z", rows: [
      { values: { Folio: "3", Asesor: "Consultora marzo A", Monto: "397.823" }, sourceLinks: [] },
      { values: { Folio: "4", Asesor: "Consultora marzo B", Monto: "650.000" }, sourceLinks: [] },
    ] },
    { period: "septiembre 2026", status: "available" as const, retrieved_at: "2026-10-10T00:00:00.000Z", rows: [
      { values: { Folio: "9", Asesor: "Consultora septiembre", Monto: "400.000" }, sourceLinks: [] },
    ] },
  ],
};

describe("Asesorías externas de Cámara", () => {
  it("muestra folio, asesor, monto y solicitante en un módulo propio", () => {
    const html = renderToStaticMarkup(createElement(CamaraTransparencyDetails, {
      deputyId: "1009",
      applicantName: "Jorge Alessandri Vergara",
      section,
    }));

    expect(html).toContain('id="asesorias-externas"');
    expect(html).toContain("Asesorías externas");
    expect(html).toContain("solicitante: Jorge Alessandri Vergara");
    expect(html).toContain("Consultora marzo A");
    expect(html).toContain("$397.823");
    expect(html).toContain("subtotal publicado $1.047.823");
    expect(html).toContain('href="https://www.camara.cl/diputados/detalle/asesoriaexterna.aspx?prmId=1009"');
    expect(html).not.toContain("Pasajes aéreos nacionales");
    expect(html).not.toContain("No se suman a la dieta ni al costo mensual");
  });

  it("ordena los cortes recientes primero y mantiene el alcance histórico separado", () => {
    const html = renderToStaticMarkup(createElement(CamaraTransparencyDetails, {
      deputyId: "1009",
      applicantName: "Jorge Alessandri Vergara",
      section,
      historicalPeriod: "2022-2026",
    }));

    expect(html.indexOf("septiembre 2026")).toBeLessThan(html.indexOf("marzo 2026"));
    expect(html).toContain("no se agregan al costo de su cargo actual");
  });

  it("no muestra un módulo cuando no hay registros enlazados al diputado", () => {
    expect(renderToStaticMarkup(createElement(CamaraTransparencyDetails, {
      deputyId: "1009",
      applicantName: "Jorge Alessandri Vergara",
      section: undefined,
    }))).toBe("");
  });
});
