import { describe, expect, it } from "vitest";
import { getMunicipalidadSeoCopy } from "@/lib/municipalidad-seo";

describe("SEO de fichas municipales", () => {
  it("gives each municipality a concise, unique title and accurate search snippet", () => {
    const hualpen = getMunicipalidadSeoCopy("Hualpén");
    const niquen = getMunicipalidadSeoCopy("Ñiquén");

    expect(hualpen.title).toBe("Municipalidad de Hualpén: Presupuesto, Personal y Compras | El Cambiómetro");
    expect(hualpen.title.length).toBeLessThan(80);
    expect(hualpen.description).toContain("datos disponibles");
    expect(hualpen.description).toContain("Municipalidad de Hualpén");
    expect(hualpen.description).toContain("fuente y período");
    expect(niquen.title).toContain("Ñiquén");
    expect(niquen.title).not.toBe(hualpen.title);
  });
});
