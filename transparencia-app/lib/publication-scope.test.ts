import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { formatPublicIndicator, PUBLICATION_SCOPES } from "./publication-scope";
import DashboardLayout from "../app/dashboard/layout";
import PublicationScopeNotice from "../components/data/PublicationScopeNotice";

describe("alcance de publicación", () => {
  it("retira el número en revisión y no convierte nulo en cero", () => {
    expect(formatPublicIndicator(987654, "en_revision", String)).toBe("En revisión");
    expect(formatPublicIndicator(null, "respaldado", String)).toBe("No informado");
    expect(formatPublicIndicator(0, "respaldado", String)).toBe("0");
    expect(formatPublicIndicator(Number.NaN, "cobertura_limitada", String)).toBe("No informado");
  });
  it("dashboard mantiene su contenido y publica un único aviso de referencia estimada", () => {
    const html = renderToStaticMarkup(DashboardLayout({ children: createElement("h1", null, "Dashboard parlamentario") }));
    expect(html.match(/aria-label="Alcance de la información"/g)).toHaveLength(1);
    expect(html).toContain("Dashboard parlamentario");
    expect(html).toContain("referencia fija estimada");
    expect(html).toContain("/como-funciona#alcance-publicacion");
  });
  it("todos los avisos declaran un límite concreto sin afirmar cobertura universal", () => {
    for (const area of Object.keys(PUBLICATION_SCOPES) as Array<keyof typeof PUBLICATION_SCOPES>) {
      const html = renderToStaticMarkup(createElement(PublicationScopeNotice, { area }));
      expect(html).toContain("Cobertura limitada");
      expect(html).toContain(PUBLICATION_SCOPES[area]);
      expect(html).not.toContain("HTTP 403");
      expect(html).toContain("/como-funciona#alcance-publicacion");
    }
  });
});
