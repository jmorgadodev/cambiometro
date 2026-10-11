import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import EtlHealthDashboardClient from "@/components/datos/EtlHealthDashboardClient";

describe("panel de datos DIPRES", () => {
  it("rotula el conteo del catálogo validado como observaciones agregadas", () => {
    const html = renderToStaticMarkup(createElement(EtlHealthDashboardClient, { dipresRelease: { recordCount: 5, period: "Último corte 2026-07 · 2 cortes publicados" } }));
    expect(html).toContain("Observaciones agregadas: 5");
    expect(html).toContain("Último corte 2026-07");
    expect(html).not.toContain("15.689");
  });

  it("no presenta una cifra antigua si el catálogo no se validó", () => {
    const html = renderToStaticMarkup(createElement(EtlHealthDashboardClient, { dipresRelease: null }));
    expect(html).toContain("Corte agregado no verificado");
    expect(html).not.toContain("15.689");
  });
});
