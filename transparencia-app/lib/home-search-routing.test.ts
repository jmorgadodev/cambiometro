import { describe, expect, it } from "vitest";
import { resolveHomeSearchTarget, resolveSearchResultUrl } from "./home-search-routing";

describe("rutas del buscador global de la home", () => {
  it("lleva funcionarios al explorador de remuneraciones y no al tab de parlamentarios", () => {
    expect(resolveHomeSearchTarget([{ type: "funcionario" }], "Rosa Bustamante")).toEqual({
      href: "/remuneraciones-publicas/?q=Rosa%20Bustamante",
      label: "Ver todas las remuneraciones →",
    });
  });

  it("prioriza remuneraciones cuando una búsqueda mezcla autoridades y pagos", () => {
    expect(resolveHomeSearchTarget([{ type: "politico" }, { type: "funcionario" }], "Torrealba").href)
      .toBe("/remuneraciones-publicas/?q=Torrealba");
  });

  it("corrige también el enlace individual de un funcionario", () => {
    expect(resolveSearchResultUrl({ type: "funcionario", nombre: "Rosa Bustamante" }))
      .toBe("/remuneraciones-publicas/?q=Rosa%20Bustamante");
  });

  it("no envía una búsqueda sin resultados al listado parlamentario", () => {
    expect(resolveHomeSearchTarget([], "Sofía Pumpin").href)
      .toBe("/remuneraciones-publicas/?q=Sof%C3%ADa%20Pumpin");
  });
});
