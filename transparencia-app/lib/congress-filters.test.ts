import { describe, expect, it } from "vitest";
import { filterCongressEntries, readCongressFilters } from "./congress-filters";

const entries = [
  { politico: { nombre_completo: "José Pérez", cargo: "Diputado", distrito_region: "Biobío", numero_distrito: 20 }, partido: { nombre: "Partido Ejemplo", sigla: "PE" } },
  { politico: { nombre_completo: "María Pérez", cargo: "Senador", distrito_region: "Araucanía" }, partido: { nombre: "Independiente", sigla: "IND" } },
];
describe("filtros del directorio parlamentario", () => {
  it("mantiene todas las fichas sin filtro y conserva sólo la cámara seleccionada", () => {
    expect(filterCongressEntries(entries, readCongressFilters(new URLSearchParams()))).toHaveLength(2);
    expect(filterCongressEntries(entries, readCongressFilters(new URLSearchParams("cargo=Senador")))).toEqual([entries[1]]);
  });
  it("combina cámara y búsqueda, admite tildes y busca por territorio y partido", () => {
    for (const q of ["jose", "biobio", "distrito 20", "PE"]) expect(filterCongressEntries(entries, { cargo: "Diputado", query: q })).toEqual([entries[0]]);
    expect(filterCongressEntries(entries, { cargo: "Diputado", query: "maria" })).toEqual([]);
    expect(filterCongressEntries(entries, { cargo: null, query: "Pérez" })).toHaveLength(2);
  });
  it("ignora cámaras no válidas y normaliza la búsqueda compartida en URL", () => {
    expect(readCongressFilters(new URLSearchParams("cargo=Ministro&q=%20%20Perez%20"))).toEqual({ cargo: null, query: "Perez" });
    expect(filterCongressEntries(entries, { cargo: null, query: "inexistente" })).toEqual([]);
  });
});
