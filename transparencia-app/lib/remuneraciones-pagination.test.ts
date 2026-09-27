import { describe, expect, it } from "vitest";
import { remunerationResultWindow, distinctResultWindow, remunerationGroupKey } from "./remuneraciones-pagination";

describe("paginación de registros sin perder fichas agrupadas", () => {
  it("no confunde tres nombres repetidos con quince registros de una página", () => {
    expect(remunerationResultWindow(0, 30, 2, 15)).toMatchObject({start:15,end:30,remoteEnd:30,totalPages:2,totalRecords:30});
  });
  it("calcula la página remota real cuando cruza los resultados estáticos", () => {
    expect(remunerationResultWindow(24, 30, 2, 15)).toMatchObject({start:15,end:30,remoteEnd:6,totalRecords:54});
    expect(remunerationResultWindow(24, 30, 3, 15)).toMatchObject({start:30,end:45,remoteEnd:21,totalPages:4});
  });
  it("mantiene el último segmento sin inflar su rango", () => {
    expect(remunerationResultWindow(24, 30, 4, 15)).toMatchObject({start:45,end:54,remoteEnd:30});
  });
});

describe("paginación de fichas distintas", () => {
  it("pagina después de agrupar registros repetidos de la misma persona", () => {
    const rows = ["Johannes", "Johannes", "Johannes", "Vanessa", "Hans", "Hans", "Alfonso"];
    expect(distinctResultWindow(rows, 1, 3, (name) => name)).toMatchObject({
      items: ["Johannes", "Vanessa", "Hans"], start: 0, end: 3,
    });
    expect(distinctResultWindow(rows, 2, 3, (name) => name)).toMatchObject({
      items: ["Alfonso"], start: 3, end: 4,
    });
  });

  it("no fusiona homónimos de fuentes u organismos distintos", () => {
    const sameMunicipality = remunerationGroupKey({ name: "María Paz Rojas", source: "cplt", organization: "Municipalidad A", fallbackId: "1" });
    expect(remunerationGroupKey({ name: "ROJAS MARÍA PAZ", source: "cplt", organization: "Municipalidad A", fallbackId: "2" })).toBe(sameMunicipality);
    expect(remunerationGroupKey({ name: "María Paz Rojas", source: "cplt", organization: "Municipalidad B", fallbackId: "3" })).not.toBe(sameMunicipality);
    expect(remunerationGroupKey({ name: "María Paz Rojas", source: "senado", organization: "Senado", fallbackId: "4" })).not.toBe(sameMunicipality);
  });
});
