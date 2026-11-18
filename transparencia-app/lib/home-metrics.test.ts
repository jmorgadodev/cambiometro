import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MetricsBar } from "@/components/home/MetricsBar";
import { SourcesCatalog } from "@/components/home/SourcesCatalog";

describe("métricas verificables de Home", () => {
  it("muestra las fichas parlamentarias sin sustituir un total desconocido por cero", () => {
    const html = renderToStaticMarkup(createElement(MetricsBar, {
      metrics: { parlamentarios: 205, fuentes: 12, entidades: 0, votaciones: 3, relaciones: 2 },
    }));
    expect(html).toContain(">205</span>");
    expect(html).toContain("Fichas parlamentarias");
    expect(html).toContain("Cámara y Senado");
    expect(html).not.toContain("No calculable");
    expect(html).not.toContain("Registros indexados");
  });

  it("el catálogo de fuentes admite el mismo total desconocido sin romper la página", () => {
    const html = renderToStaticMarkup(createElement(SourcesCatalog, {
      totalSources: 1,
      totalRecords: null,
      chapters: [{ id: "dinero", romanNumeral: "I", title: "Dinero", shortLabel: "Dinero", question: "Alcance", totalRecords: "3", sourcesCount: 1, sources: [] }],
    }));
    expect(html).not.toContain("No calculable");
    expect(html).not.toContain('uppercase">Registros</span>');
    expect(html).toContain("Fuentes</span>");
  });

  it("conserva el total del catálogo cuando está informado, incluido cero", () => {
    for (const totalRecords of [0, 1234]) {
      const html = renderToStaticMarkup(createElement(SourcesCatalog, {
        totalSources: 1, totalRecords,
        chapters: [{ id: "dinero", romanNumeral: "I", title: "Dinero", shortLabel: "Dinero", question: "Alcance", totalRecords: "3", sourcesCount: 1, sources: [] }],
      }));
      expect(html).toContain(totalRecords.toLocaleString("es-CL"));
      expect(html).toContain('uppercase">Registros</span>');
    }
  });
});
