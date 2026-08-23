import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = join(import.meta.dirname, "..");

describe("Footer compacto y pulido móvil", () => {
  const layoutContent = readFileSync(join(projectRoot, "app", "layout.tsx"), "utf8");
  const cssContent = readFileSync(join(projectRoot, "app", "globals.css"), "utf8");

  it("implementa la estructura de secciones con lista flex y gap compacto (fix raíz)", () => {
    expect(layoutContent).toContain("site-footer__list");
    expect(layoutContent).toContain("site-footer__link");
    expect(layoutContent).toContain("site-footer__title");

    // No contiene la columna duplicada Explorar
    expect(layoutContent).not.toContain('aria-label="Explorar"');
    expect(layoutContent).not.toContain('title: "Explorar"');

    // CSS debe incluir list-style: none, flex-direction: column, gap: 10px
    expect(cssContent).toContain(".site-footer__list");
    expect(cssContent).toContain("list-style: none");
    expect(cssContent).toContain("flex-direction: column");
    expect(cssContent).toContain("gap: 10px");
  });

  it("móvil: marca con misión y corte como caja compacta --surface-2 no inline", () => {
    expect(layoutContent).toContain("site-footer__mission");
    expect(layoutContent).toContain("provenance-stamp");
    expect(layoutContent).toContain("Última consolidación");
    expect(layoutContent).toContain("registros oficiales compilados");

    expect(cssContent).toContain(".site-footer__mission");
    expect(cssContent).toContain("font-size: 13.5px");
    expect(cssContent).toContain(".provenance-stamp");
    expect(cssContent).toContain("background: var(--surface-2)");
    expect(cssContent).toContain("border: 1px solid var(--border)");
  });

  it("móvil: links del footer accesibles", () => {
    expect(cssContent).toContain(".site-footer__link");
    expect(cssContent).toContain("min-height: 38px");
    expect(cssContent).toContain("padding-block: 4px");
  });

  it("barra final legal contiene © 2026, Creado por Jorge Morgado, ImpulsaCV ↗, iconos SVG de Instagram, X y LinkedIn", () => {
    expect(layoutContent).toContain("© 2026 El Cambiómetro · Información pública verificada");
    expect(layoutContent).toContain("Creado por");
    expect(layoutContent).toContain("Jorge Morgado");
    expect(layoutContent).toContain("https://www.linkedin.com/in/jorge-morgado/");
    expect(layoutContent).toContain("LinkedInIcon");
    expect(layoutContent).toContain("InstagramIcon");
    expect(layoutContent).toContain("XIcon");
    expect(layoutContent).toContain("ImpulsaCV");
    expect(layoutContent).toContain("https://impulsacv.cl");
    expect(layoutContent).toContain("https://www.instagram.com/cambiometro/");
    expect(layoutContent).toContain("https://x.com/cambiometro");
  });

  it("desktop (>=1024px) cuenta con grid compacto de 3 columnas (brand + 2 nav)", () => {
    expect(cssContent).toContain("@media (min-width: 1024px)");
    expect(cssContent).toContain("grid-template-columns: minmax(18rem, 2fr) repeat(2, minmax(10rem, 1fr))");
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
