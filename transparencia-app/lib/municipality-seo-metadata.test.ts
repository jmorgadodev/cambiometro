import { describe, expect, it } from "vitest";
import { buildMunicipalitySeoMetadata } from "./municipality-seo-metadata";

describe("metadata SEO municipal basada en datos publicados", () => {
  it("menciona sólo las categorías disponibles para la comuna", () => {
    const metadata = buildMunicipalitySeoMetadata("Camiña", {
      periodCount: 31, budgetYear: 2025, populationCensusYear: 2024, hasVerifiedPurchases: false,
    });
    expect(metadata.title).toContain("Remuneraciones y Presupuesto");
    expect(metadata.description).toContain("31 períodos");
    expect(metadata.description).toContain("presupuesto SINIM 2025");
    expect(metadata.description).toContain("Censo 2024");
    expect(metadata.description).not.toContain("compras públicas");
  });

  it("no promete fuentes o categorías que no están publicadas", () => {
    const metadata = buildMunicipalitySeoMetadata("Alto Hospicio", {
      periodCount: 0, budgetYear: null, populationCensusYear: null, hasVerifiedPurchases: false,
    });
    expect(metadata.title).toBe("Municipalidad de Alto Hospicio | Datos públicos | El Cambiómetro");
    expect(metadata.description).not.toMatch(/remuneraciones|presupuesto|censo|compras/i);
  });
});
