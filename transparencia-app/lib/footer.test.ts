import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = join(import.meta.dirname, "..");

describe("Footer y pulido móvil", () => {
  const layoutContent = readFileSync(join(projectRoot, "app", "layout.tsx"), "utf8");
  const cssContent = readFileSync(join(projectRoot, "app", "globals.css"), "utf8");

  it("implementa la estructura de secciones con lista flex y gap 12px (fix raíz)", () => {
    expect(layoutContent).toContain("site-footer__list");
    expect(layoutContent).toContain("site-footer__link");
    expect(layoutContent).toContain("site-footer__title");

    // CSS debe incluir list-style: none, flex-direction: column, gap: 12px
    expect(cssContent).toContain(".site-footer__list");
    expect(cssContent).toContain("list-style: none");
    expect(cssContent).toContain("flex-direction: column");
    expect(cssContent).toContain("gap: 12px");
  });

  it("móvil: marca con misión 14px y corte como caja --surface-2 no inline", () => {
    expect(layoutContent).toContain("site-footer__mission");
    expect(layoutContent).toContain("provenance-stamp");
    expect(layoutContent).toContain("Última consolidación");
    expect(layoutContent).toContain("registros oficiales compilados");

    expect(cssContent).toContain(".site-footer__mission");
    expect(cssContent).toContain("font-size: 14px");
    expect(cssContent).toContain(".provenance-stamp");
    expect(cssContent).toContain("background: var(--surface-2)");
    expect(cssContent).toContain("border: 1px solid var(--border)");
  });

  it("móvil: tap targets >= 44px en links del footer", () => {
    expect(cssContent).toContain(".site-footer__link");
    expect(cssContent).toContain("min-height: 44px");
    expect(cssContent).toContain("padding-block: 8px");
  });

  it("barra final legal contiene © 2026, Información pública verificada, Creado por Jorge Morgado, ImpulsaCV ↗, Instagram y X @cambiometro", () => {
    expect(layoutContent).toContain("© 2026 El Cambiómetro · Información pública verificada");
    expect(layoutContent).toContain("Creado por");
    expect(layoutContent).toContain("Jorge Morgado");
    expect(layoutContent).toContain("https://www.linkedin.com/in/jorge-morgado/");
    expect(layoutContent).toContain("ImpulsaCV");
    expect(layoutContent).toContain("Instagram @cambiometro");
    expect(layoutContent).toContain("𝕏 @cambiometro");
    expect(layoutContent).toContain("https://impulsacv.cl");
    expect(layoutContent).toContain("https://www.instagram.com/cambiometro/");
    expect(layoutContent).toContain("https://x.com/cambiometro");
  });

  it("desktop (>=1024px) cuenta con grid de 4 columnas", () => {
    expect(cssContent).toContain("@media (min-width: 1024px)");
    expect(cssContent).toContain("grid-template-columns: minmax(18rem, 2fr) repeat(3, minmax(10rem, 1fr))");
  });

  it("pulido home móvil: banda KPI en 2 columnas con último ítem a ancho completo", () => {
    expect(cssContent).toContain(".home-stat:last-child");
    expect(cssContent).toContain("grid-column: 1 / -1");
  });

  it("botón de búsqueda en home tiene texto blanco legible con alto contraste", () => {
    expect(cssContent).toContain(".home-query button");
    expect(cssContent).toContain("color: #ffffff");
  });
});
