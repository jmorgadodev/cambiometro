import { describe, expect, it } from "vitest";
import { remunerationResultWindow } from "./remuneraciones-pagination";

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
