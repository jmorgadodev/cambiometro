import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CamaraTransparencyDetails } from "@/components/politico/CamaraTransparencyDetails";

describe("CamaraTransparencyDetails", () => {
  it("muestra datos originales, período y evidencia oficial, separados del costo mensual", () => {
    const html = renderToStaticMarkup(createElement(CamaraTransparencyDetails, {
      deputyId: "1206",
      sections: {
        asesorias_externas: {
          status: "available",
          period: "septiembre 2026",
          retrieved_at: "2026-10-10T00:00:00.000Z",
          source_url: "https://www.camara.cl/diputados/detalle/asesoriaexterna.aspx?prmId=1206",
          rows: [{ values: { Asesor: "Asesora A", Monto: "$400.000" }, sourceLinks: ["https://www.camara.cl/doc/1.pdf"] }],
        },
      },
    }));

    expect(html).toContain("Asesorías externas");
    expect(html).toContain("Asesora A");
    expect(html).toContain("$400.000");
    expect(html).toContain("septiembre 2026");
    expect(html.toLowerCase()).toContain("no se suman a la dieta ni al costo mensual");
    expect(html).toContain('href="https://www.camara.cl/doc/1.pdf" target="_blank" rel="noopener noreferrer"');
  });

  it("distingue un corte vacío de un corte no verificable y una categoría sin corte", () => {
    const html = renderToStaticMarkup(createElement(CamaraTransparencyDetails, {
      deputyId: "1206",
      sections: {
        audiencias_no_lobby: {
          status: "empty_confirmed",
          period: "octubre 2026",
          retrieved_at: "2026-10-10T00:00:00.000Z",
          source_url: "https://www.camara.cl/diputados/detalle/audiencia.aspx?prmId=1206",
          rows: [],
        },
        asesorias_externas: {
          status: "unavailable",
          period: null,
          retrieved_at: "2026-10-10T00:00:00.000Z",
          source_url: "https://www.camara.cl/diputados/detalle/asesoriaexterna.aspx?prmId=1206",
          rows: [],
        },
      },
    }));

    expect(html).toContain("La Cámara no registra elementos en este corte.");
    expect(html).toContain("Corte no verificado");
    expect(html).toContain("No se pudo consultar esta categoría");
    expect(html).toContain("Sin corte incorporado");
    expect(html).not.toContain("0 registros en cortes incorporados");
  });
});
