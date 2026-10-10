import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getVerifiedMuniRRSS } from "./municipalidades-rrss";
import { getAlcaldiaPayrollStatus, selectPublishedAlcaldia, resolvePublishedAlcaldia, latestPublishedPayrollPeriod, payrollMonthsBehind } from "./municipal-alcaldia";

const old = { nombre: "Abel Becerra Vidal", cargo: "Alcalde", periodo: "2025-01", remuneracion_bruta: 468212 };
const recent = { nombre: "Marisela Jimenez Cruces", cargo: "Alcaldesa", periodo: "2026-08", remuneracion_bruta: 8120877 };

describe("alcaldía y remuneración del corte publicado", () => {
  it("conserva autoridades documentadas separadas de los registros de pago", () => {
    for (const [id, nombre, host] of [
      ["muni-tortel", "Marisela Jiménez Cruces", "www.tortel.cl"],
      ["muni-ohiggins", "Raquel Torres Cuevas", "www.municipalidadohiggins.cl"],
    ]) {
      const authority = getVerifiedMuniRRSS(id)?.autoridad_documentada;
      expect(authority?.nombre).toBe(nombre);
      expect(new URL(authority!.url).hostname).toBe(host);
      expect(authority?.fecha_revision).toBe("2026-10-05");
      expect(authority).not.toHaveProperty("remuneracion_bruta");
      expect(authority).not.toHaveProperty("partido");
    }
    expect(old.remuneracion_bruta).toBe(468212);
  });
  it("selecciona el último corte disponible y calcula desfase con la fecha de consulta", () => {
    expect(latestPublishedPayrollPeriod({ periodo_cplt_reciente: "2026-07", periodos_disponibles: [{ periodo: "2026-08" }, { periodo: "2026-99" }] })).toBe("2026-08");
    expect(payrollMonthsBehind("2026-08", new Date("2026-10-05T12:00:00Z"))).toBe(2);
    expect(payrollMonthsBehind("2026-08", new Date("2027-01-05T12:00:00Z"))).toBe(5);
    expect(payrollMonthsBehind(null, new Date("2026-10-05T12:00:00Z"))).toBeNull();
  });
  it("el directorio usa la misma alcaldía resuelta que la ficha, no el nombre histórico del índice", () => {
    const page = readFileSync(join(process.cwd(), "app/municipalidades/page.tsx"), "utf8");
    expect(page).toContain("getMunicipalidadData(item.id)?.alcalde ?? null");
    expect(page).toContain("conAlcaldeCount: allData.filter((item) => item.alcalde !== null).length");
  });
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
  it("conserva el estamento original aunque la alcaldesa figure como Directivo", () => {
    expect(selectPublishedAlcaldia([{ ...recent, estamento: "Directivo" }], "2026-08")?.estamento).toBe("Directivo");
  });
  it("consulta la alcaldía del mes seleccionado aunque exista un corte posterior parcial", () => {
    const july = { ...recent, periodo: "2026-07" };
    expect(resolvePublishedAlcaldia({ periodo_cplt_reciente: "2026-07", periodos_disponibles: [{ periodo: "2026-08" }], top_remuneraciones_por_periodo: { "2026-07": [july] } }, "2026-07")).toEqual(july);
  });
  it("distingue un corte sin registro de uno con varias alcaldías", () => {
    expect(getAlcaldiaPayrollStatus({ alcaldia_registros: [], periodos_disponibles: [{ periodo: "2026-08" }] }, "2026-08")).toBe("sin_registro");
    expect(getAlcaldiaPayrollStatus({ alcaldia_registros: [recent, { ...recent, nombre: "Otra persona" }] }, "2026-08")).toBe("multiple");
  });
});
