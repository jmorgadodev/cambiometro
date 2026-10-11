import { createElement } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CamaraOfficialProfileDetails } from "@/components/politico/CamaraOfficialProfileDetails";
import { mergeCamaraOfficialProfileForDisplay } from "@/lib/personal-apoyo";

describe("CamaraOfficialProfileDetails", () => {
  it("recupera por ID los campos publicados en el snapshot oficial separado", () => {
    const ficha = {
      comunas_distrito: null,
      numero_distrito: null,
      region: null,
      periodo: null,
      partido: null,
      bancada: null,
      foto: null,
      redes: {},
    };
    const merged = mergeCamaraOfficialProfileForDisplay(ficha, "1009");

    expect(merged.perfil_fuente).toContain("prmId=1009");
    expect(merged.perfil_verificado_en).toBeTruthy();
    expect(merged.comunas_distrito || merged.region || merged.numero_distrito).toBeTruthy();
    expect(mergeCamaraOfficialProfileForDisplay(ficha, "no-match")).toBe(ficha);
  });

  it("presenta ubicación, períodos, partido, bancada y contacto que publica Cámara", () => {
    const html = renderToStaticMarkup(createElement(CamaraOfficialProfileDetails, {
      ficha: {
        comunas_distrito: "Ñuñoa, Providencia",
        numero_distrito: 10,
        region: "Región Metropolitana",
        periodo: "2026-2030",
        periodos: ["2018-2022", "2022-2026", "2026-2030"],
        partido: "Partido A",
        partido_fuente: "https://opendata.camara.cl/ficha",
        bancada: "Bancada A",
        sitio_web: "https://diputada.example.cl/",
        telefono: "+56 2 1234 5678",
        email: "diputada@example.cl",
        foto: null,
        redes: { x: "https://x.com/diputada", facebook: "https://facebook.com/diputada" },
        enlaces_publicos: [{ label: "Sitio Web", url: "https://diputada.example.cl/" }],
      },
    }));

    for (const text of ["Comunas del distrito", "Ñuñoa, Providencia", "Distrito", "Región Metropolitana", "2026-2030", "Partido publicado por Cámara", "Bancada A", "2018-2022", "Fuente oficial", "opendata.camara.cl", "Teléfono", "Correo", "X", "Facebook"]) {
      expect(html).toContain(text);
    }
  });

  it("no oculta los campos cuando faltan en el corte incorporado", () => {
    const html = renderToStaticMarkup(createElement(CamaraOfficialProfileDetails, {
      ficha: { comunas_distrito: null, numero_distrito: null, region: null, periodo: null, foto: null, partido: null, bancada: null, redes: {} },
    }));

    for (const label of ["Comunas del distrito", "Distrito", "Región", "Período vigente", "Partido publicado por Cámara", "Bancada", "Períodos parlamentarios publicados", "Contacto oficial", "Sitio web y redes publicados por Cámara"]) {
      expect(html).toContain(label);
    }
    expect(html.match(/No informado en el dato incorporado/g)).toHaveLength(9);
  });

  it("renderiza contacto y redes que ya están en el dataset oficial local", () => {
    const dataset = JSON.parse(readFileSync(resolve("data/personal-apoyo.json"), "utf8"));
    const ficha = mergeCamaraOfficialProfileForDisplay(dataset.diputados["803"].ficha, "803");
    const html = renderToStaticMarkup(createElement(CamaraOfficialProfileDetails, { ficha }));

    expect(ficha.email).toMatch(/@congreso\.cl$/);
    expect(html).toContain(`mailto:${ficha.email}`);
    expect(html).toContain(ficha.redes.instagram);
    expect(html).toContain("Correo:");
    expect(html).toContain("Instagram");
  });
});
