import { describe, expect, it } from "vitest";
import { remunerationPersonKey, remunerationPersonWindow, remunerationResultWindow } from "./remuneraciones-pagination";

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

  it("pagina perfiles agrupados después de consolidar sus meses", () => {
    const profiles = Array.from({ length: 16 }, (_, id) => ({ id }));
    expect(remunerationPersonWindow(profiles, 1, 15)).toMatchObject({ start: 0, end: 15, totalProfiles: 16, totalPages: 2 });
    expect(remunerationPersonWindow(profiles, 2, 15).items).toEqual([{ id: 15 }]);
  });

  it("no fusiona homónimos nominales de distinta fuente, organismo o cargo", () => {
    const row = { nombreOriginal: "RÍO Sebastián Torrealba Del", sourceId: "cplt-municipal", organismoOriginal: "Municipalidad A", cargoOriginal: "Asesor" };
    expect(remunerationPersonKey(row)).toBe(remunerationPersonKey({ ...row, nombreOriginal: "Sebastián Torrealba del Río" }));
    expect(remunerationPersonKey(row)).not.toBe(remunerationPersonKey({ ...row, sourceId: "cplt-central" }));
    expect(remunerationPersonKey(row)).not.toBe(remunerationPersonKey({ ...row, organismoOriginal: "Municipalidad B" }));
    expect(remunerationPersonKey(row)).toBe(remunerationPersonKey({ ...row, cargoOriginal: "Director" }));
  });
});
