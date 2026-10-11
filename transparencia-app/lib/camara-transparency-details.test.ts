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

  it("expone las cuatro categorías oficiales sin fusionar viajes y audiencias", () => {
    const html = renderToStaticMarkup(createElement(CamaraTransparencyDetails, {
      deputyId: "1206",
      sections: {
        asesorias_externas: { status: "available", period: "septiembre 2026", retrieved_at: "2026-10-10T00:00:00.000Z", source_url: "https://www.camara.cl/diputados/detalle/asesoriaexterna.aspx?prmId=1206", rows: [{ values: { Asesor: "Asesoría oficial" }, sourceLinks: [] }] },
        pasajes_aereos_nacionales: { status: "available", period: "septiembre 2026", retrieved_at: "2026-10-10T00:00:00.000Z", source_url: "https://www.camara.cl/diputados/detalle/pasajesaereos.aspx?prmId=1206", rows: [{ values: { Destino: "Vuelo nacional" }, sourceLinks: [] }] },
        instancias_internacionales: { status: "available", period: "septiembre 2026", retrieved_at: "2026-10-10T00:00:00.000Z", source_url: "https://www.camara.cl/diputados/detalle/instanciainternacionales.aspx?prmId=1206", rows: [{ values: { Instancia: "Misión internacional" }, sourceLinks: [] }] },
        audiencias_no_lobby: { status: "available", period: "septiembre 2026", retrieved_at: "2026-10-10T00:00:00.000Z", source_url: "https://www.camara.cl/diputados/detalle/audiencia.aspx?prmId=1206", rows: [{ values: { Lugar: "Oficina distrital" }, sourceLinks: [] }] },
      },
    }));

    expect(html).toContain("Asesorías externas");
    expect(html).toContain("Pasajes aéreos nacionales");
    expect(html).toContain("Participación en instancias internacionales");
    expect(html).toContain("Audiencias no regidas por la Ley del Lobby");
    expect(html).toContain("Asesoría oficial");
    expect(html).toContain("Vuelo nacional");
    expect(html).toContain("Misión internacional");
    expect(html).toContain("Oficina distrital");
    expect(html.match(/<details[^>]*open=""/g)).toHaveLength(4);
  });

  it("conserva y muestra columnas que sólo aparecen en filas posteriores", () => {
    const html = renderToStaticMarkup(createElement(CamaraTransparencyDetails, {
      deputyId: "1206",
      sections: {
        asesorias_externas: {
          status: "available",
          period: "septiembre 2026",
          retrieved_at: "2026-10-10T00:00:00.000Z",
          source_url: "https://www.camara.cl/diputados/detalle/asesoriaexterna.aspx?prmId=1206",
          rows: [
            { values: { Asesor: "Asesora A", Monto: "$400.000" }, sourceLinks: [] },
            { values: { Asesor: "Asesor B", Monto: "$250.000", "Declaración concurrente": "Sí" }, sourceLinks: [] },
          ],
        },
      },
    }));

    expect(html).toContain("Declaración concurrente");
    expect(html).toContain("Asesor B");
    expect(html).toContain("Sí");
  });
});
