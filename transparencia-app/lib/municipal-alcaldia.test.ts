import { describe, expect, it } from "vitest";
import { selectPublishedAlcaldia, resolvePublishedAlcaldia } from "./municipal-alcaldia";

const old = { nombre: "Abel Becerra Vidal", cargo: "Alcalde", periodo: "2025-01", remuneracion_bruta: 468212 };
const recent = { nombre: "Marisela Jimenez Cruces", cargo: "Alcaldesa", periodo: "2026-08", remuneracion_bruta: 8120877 };

describe("alcaldía y remuneración del corte publicado", () => {
  it("selecciona el corte reciente sin depender del orden ni modificar montos históricos", () => {
    for (const rows of [[old, recent], [recent, old]]) {
      expect(selectPublishedAlcaldia(rows, "2026-08")).toEqual(recent);
      expect(old.remuneracion_bruta).toBe(468212);
    }
  });
  it("no presenta como vigente un registro anterior al último corte municipal", () => {
    expect(selectPublishedAlcaldia([old], "2026-08")).toBeNull();
  });
  it("no elige entre dos personas en el mismo corte ni asigna una subrogancia a la titularidad", () => {
    expect(selectPublishedAlcaldia([recent, { ...recent, nombre: "Otra persona" }], "2026-08")).toBeNull();
    expect(selectPublishedAlcaldia([{ ...recent, cargo: "Alcaldesa Subrogante" }], "2026-08")).toBeNull();
    expect(selectPublishedAlcaldia([{ ...recent, cargo: "Secretaria Alcaldía", estamento: "Alcalde" }], "2026-08")).toBeNull();
  });
  it("rechaza períodos inválidos y contratos terminados antes del corte", () => {
    expect(selectPublishedAlcaldia([{ ...recent, periodo: "2026-99" }], "2026-99")).toBeNull();
    expect(selectPublishedAlcaldia([{ ...recent, fecha_termino: "2026-07-31" }], "2026-08")).toBeNull();
  });
  it("conserva cero y no informado sin filtrar la identidad por el sueldo", () => {
    for (const value of [0, null]) {
      expect(selectPublishedAlcaldia([{ ...recent, remuneracion_bruta: value }], "2026-08")?.remuneracion_bruta).toBe(value);
    }
  });
  it("rechaza duplicados conflictivos y no fusiona IDs distintos por nombre", () => {
    expect(selectPublishedAlcaldia([recent, { ...recent, remuneracion_bruta: 99 }], "2026-08")).toBeNull();
    expect(selectPublishedAlcaldia([{ ...recent, id: "a" }, { ...recent, id: "b" }], "2026-08")).toBeNull();
    expect(selectPublishedAlcaldia([recent, { ...recent }], "2026-08")).toEqual(recent);
  });
  it("corrige el agregado antiguo usando evidencia del último corte, no el snapshot local", () => {
    expect(resolvePublishedAlcaldia({ alcalde: old, periodo_cplt_reciente: "2026-08", top_remuneraciones_por_periodo: { "2026-08": [recent], "2025-01": [old] } })).toEqual(recent);
  });
  it("prefiere la lista completa de alcaldías sobre el top salarial parcial", () => {
    expect(resolvePublishedAlcaldia({ alcalde: recent, periodo_cplt_reciente: "2026-08", alcaldia_registros: [recent, { ...recent, nombre: "Otra persona" }], top_remuneraciones_por_periodo: { "2026-08": [recent] } })).toBeNull();
  });
  it("no confunde el corte representativo de dotación con el último período publicado", () => {
    expect(resolvePublishedAlcaldia({ alcalde: old, periodo_cplt_reciente: "2025-01", periodos_disponibles: [{ periodo: "2026-08" }], top_remuneraciones_por_periodo: { "2026-08": [recent] } })).toEqual(recent);
  });
});
