import { describe, expect, it } from "vitest";
import { interleaveDistinctSearchResults, resolveHomeSearchTarget, resolveSearchResultUrl } from "./home-search-routing";

describe("rutas del buscador global de la home", () => {
  it("no repite un mismo destino al unir R2 y remuneraciones estáticas", () => {
    const worker = {type:"remuneracion" as const,nombre:"RÍO SEBASTIÁN TORREALBA DEL",url:"/personas?old=1"};
    const history = {...worker,url:"/remuneraciones-publicas?q=old"};
    expect(interleaveDistinctSearchResults([worker],[history])).toEqual([worker]);
  });
  it("conserva diversidad y llena el cupo después de omitir duplicados", () => {
    const workers=Array.from({length:8},(_,i)=>({type:"funcionario" as const,nombre:`Persona ${i}`}));
    const staticResults=[{type:"remuneracion" as const,nombre:"Persona 0"},{type:"remuneracion" as const,nombre:"Otra persona"}];
    const result=interleaveDistinctSearchResults(workers,staticResults);
    expect(result).toHaveLength(8);
    expect(result.map(row=>row.nombre)).toEqual(["Persona 0","Persona 1","Otra persona","Persona 2","Persona 3","Persona 4","Persona 5","Persona 6"]);
    expect(workers).toHaveLength(8);
    expect(staticResults).toHaveLength(2);
  });
  it("lleva todas las categorías al buscador global", () => {
    expect(resolveHomeSearchTarget([{ type: "funcionario" }], "Rosa Bustamante")).toEqual({
      href: "/buscar?q=Rosa%20Bustamante",
      label: "Ver todos los resultados →",
    });
  });

  it("mantiene juntas las categorías cuando una búsqueda mezcla autoridades y pagos", () => {
    expect(resolveHomeSearchTarget([{ type: "politico" }, { type: "funcionario" }], "Torrealba").href)
      .toBe("/buscar?q=Torrealba");
  });

  it("corrige también el enlace individual de un funcionario", () => {
    expect(resolveSearchResultUrl({ type: "funcionario", nombre: "Rosa Bustamante" }))
      .toBe("/remuneraciones-publicas/?q=Rosa%20Bustamante");
  });

  it("envía también una búsqueda sin coincidencias rápidas al buscador global", () => {
    expect(resolveHomeSearchTarget([], "Sofía Pumpin")).toEqual({
      href: "/buscar?q=Sof%C3%ADa%20Pumpin",
      label: "Ver todos los resultados →",
    });
  });
});
