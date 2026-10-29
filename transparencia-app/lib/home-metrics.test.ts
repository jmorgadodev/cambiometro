import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MetricsBar } from "@/components/home/MetricsBar";
import { SourcesCatalog } from "@/components/home/SourcesCatalog";

describe("totales no conciliados de Home", () => {
  it("conserva un total desconocido como no calculable sin convertirlo en cero", () => {
    const html = renderToStaticMarkup(createElement(MetricsBar, {
      metrics: { registros: null, fuentes: 12, entidades: 0, votaciones: 3, relaciones: 2 },
    }));
    expect(html).toContain("No calculable");
    expect(html).toContain("Registros indexados");
  });

  it("el catálogo de fuentes admite el mismo total desconocido sin romper la página", () => {
    const html = renderToStaticMarkup(createElement(SourcesCatalog, {
      totalSources: 1,
      totalRecords: null,
      chapters: [{ id: "dinero", romanNumeral: "I", title: "Dinero", shortLabel: "Dinero", question: "Alcance", totalRecords: "3", sourcesCount: 1, sources: [] }],
    }));
    expect(html).toContain("No calculable");
  });
});
