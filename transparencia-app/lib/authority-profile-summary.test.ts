import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthorityProfileSummary } from "@/components/politico/AuthorityProfileSummary";

describe("resumen accesible de la ficha", () => {
  it("mantiene cada enlace dentro de la definición de su importe y conserva los períodos", () => {
    const html = renderToStaticMarkup(createElement(AuthorityProfileSummary, {
      salary: { amount: 123, period: "2026-07" }, expenses: { amount: null, period: null }, staff: { amount: 456, period: "2026-09" },
      salarySource: "https://example.org/dieta", expensesSource: "https://example.org/gastos", staffSource: "https://example.org/personal",
    }));
    const groups = [...html.matchAll(/<dt>(.*?)<\/dt>([\s\S]*?)<\/div>/g)];
    expect(groups).toHaveLength(3);
    for (const group of groups) {
      expect(group[2]).toMatch(/^<dd>[\s\S]*<\/dd>$/);
      expect(group[2]).toContain("Consultar detalle");
      expect(group[2]).toContain("Fuente oficial");
    }
    expect(html).toContain("Julio 2026");
    expect(html).toContain("Septiembre 2026");
    expect(html).toContain("No informado");
  });
});
