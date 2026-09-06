import { describe, expect, it } from "vitest";
import {
  formatMunicipalMapValue,
  aggregateMunicipalMapMetric,
  getMunicipalMapMetric,
  normalizeRegionName,
  regionMatches,
} from "@/lib/municipalidades-map";

const municipality = {
  id: "muni-test",
  cut: "13101",
  nombre_comuna: "Santiago",
  region: "Región Metropolitana de Santiago",
  tiene_municipalidad_propia: true,
  poblacion_censo_2024: 500_000,
  presupuesto_per_capita_clp: 400_000,
  fcm_dependencia_pct: 12.5,
  partido_alcalde: null,
  alcalde: null,
  presupuesto: { vigente_clp: 200_000_000_000 },
  resumen_personal: { total_funcionarios: 1000, masa_mensual_clp: 1_000_000_000 },
  estado_frescura: "al_dia" as const,
};

describe("métricas del mapa municipal", () => {
  it("lee sólo valores publicados y conserva los faltantes como null", () => {
    expect(getMunicipalMapMetric(municipality, "population")).toBe(500_000);
    expect(getMunicipalMapMetric(municipality, "budget")).toBe(200_000_000_000);
    expect(getMunicipalMapMetric(municipality, "staff")).toBe(1000);
    expect(getMunicipalMapMetric(municipality, "purchases")).toBeNull();
  });

  it("permite usar compras sólo cuando el release entrega ese agregado", () => {
    expect(getMunicipalMapMetric(municipality, "purchases", { procesos: 42 })).toBe(42);
  });

  it("compara nombres regionales ignorando prefijos y acentos", () => {
    expect(normalizeRegionName("Región Metropolitana de Santiago")).toBe("santiago");
    expect(regionMatches("Región del Biobío", "Biobio")).toBe(true);
  });

  it("no presenta el dato faltante como cero", () => {
    expect(formatMunicipalMapValue(null, "number")).toBe("Sin dato publicado");
    expect(formatMunicipalMapValue(12.5, "percent")).toBe("12,5%");
  });

  it("agrega regiones sin confundir per cápita con una suma", () => {
    const other = { ...municipality, id: "muni-other", poblacion_censo_2024: 100_000, presupuesto_per_capita_clp: 100_000, presupuesto: { vigente_clp: 10_000_000_000 } };
    expect(aggregateMunicipalMapMetric([municipality, other], "population")).toBe(600_000);
    expect(aggregateMunicipalMapMetric([municipality, other], "perCapita")).toBe(350_000);
  });
});
