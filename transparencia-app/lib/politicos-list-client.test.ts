import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PoliticosListClient from "@/components/PoliticosListClient";
import { POLITICOS_SEED } from "@/lib/seed-politicos";

it("identifica el mes de la dieta en cada tarjeta cuando los cortes difieren", () => {
  const card = {
    politico: POLITICOS_SEED[0], partido: undefined, fuentes: 1,
    partidoConfig: { nombre: "Independiente", sigla: "IND", color_oficial: "#000" },
    verifiedPhoto: null, initials: "AA", gastosTotal: 0, gastosPeriodos: 0,
    gastosRegistros: 0, gastosUltimoPeriodo: null,
  };
  const html = renderToStaticMarkup(createElement(PoliticosListClient, {
    title: "Parlamentarios",
    items: [
      { ...card, sueldo: { cargo: "Diputado", bruto_mensual: 9_100_000, mes: "2026-07" } },
      { ...card, sueldo: { cargo: "Senador", bruto_mensual: 8_000_000, mes: "2026-06" } },
    ],
  }));
  expect(html).toContain("Julio 2026");
  expect(html).toContain("Junio 2026");
});
