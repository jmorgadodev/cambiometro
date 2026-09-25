import { describe, expect, it } from "vitest";
import { filterHomeSearchResults, flattenHomeSearchResults, homeSearchApiUrl } from "@/lib/home-search";

describe("home search results", () => {
  const payload = {
    autoridades: [{ id: "p1", type: "persona", nombre: "Ada Autoridad", url: "/politico/ada" }],
    municipalidades: [{ id: "m1", type: "municipalidad", nombre: "Municipalidad de Renca", url: "/municipalidades/renca" }],
    funcionarios: [{ id: "f1", type: "funcionario", nombre: "Ana Funcionaria", url: "/personas?search=Ana", cargo: "Asesora" }],
    remuneraciones: [{ id: "r1", type: "remuneracion", nombre: "RÍO SEBASTIÁN TORREALBA DEL", url: "/remuneraciones-publicas/?q=Rio", cargo: "COORDINADOR", organo: "PRESIDENCIA", periodo: "2026-06", monto: 9200000, fuente: "Registro 38 bis" }],
    entidades: [{ id: "e1", type: "organismo", nombre: "Ministerio de Salud", url: "/entidades/salud" }],
  };

  it("preserves all real result categories, including remuneration records", () => {
    expect(flattenHomeSearchResults(payload).map((item) => item.id)).toEqual(["r1", "p1", "f1", "m1", "e1"]);
  });

  it("filters scopes without silently falling back to parliamentarians", () => {
    const results = flattenHomeSearchResults(payload);
    expect(filterHomeSearchResults(results, "todo")).toHaveLength(5);
    expect(filterHomeSearchResults(results, "personas").map((item) => item.id)).toEqual(["p1", "f1"]);
    expect(filterHomeSearchResults(results, "remuneraciones").map((item) => item.id)).toEqual(["r1"]);
    expect(filterHomeSearchResults(results, "municipios").map((item) => item.id)).toEqual(["m1"]);
    expect(filterHomeSearchResults(results, "organismos").map((item) => item.id)).toEqual(["e1"]);
  });

  it("uses the production public index for local visual review", () => {
    expect(homeSearchApiUrl("http://127.0.0.1:3000")).toBe("https://cambiometro.impulsacv.cl/api/v1/search");
    expect(homeSearchApiUrl("https://cambiometro.impulsacv.cl")).toBe("https://cambiometro.impulsacv.cl/api/v1/search");
  });
});
