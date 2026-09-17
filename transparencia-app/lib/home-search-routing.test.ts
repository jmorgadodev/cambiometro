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
