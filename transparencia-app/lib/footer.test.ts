import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = join(import.meta.dirname, "..");

describe("Footer compacto y pulido móvil", () => {
  const rootLayoutContent = readFileSync(join(projectRoot, "app", "layout.tsx"), "utf8");
  const footerContent = readFileSync(join(projectRoot, "components", "layout", "Footer.tsx"), "utf8");
  const layoutContent = `${rootLayoutContent}\n${footerContent}`;
  const cssContent = readFileSync(join(projectRoot, "app", "globals.css"), "utf8");

  it("implementa la estructura de secciones con lista flex y gap compacto (fix raíz)", () => {
    expect(layoutContent).toContain("site-footer__list");
    expect(layoutContent).toContain("site-footer__link");
    expect(layoutContent).toContain("site-footer__title");

    // No contiene la columna duplicada Explorar
    expect(layoutContent).not.toContain('aria-label="Explorar"');
    expect(layoutContent).not.toContain('title: "Explorar"');

    // CSS mantiene una separación compacta y uniforme entre enlaces.
    expect(cssContent).toContain(".site-footer__list");
    expect(cssContent).toContain("list-style: none");
    expect(cssContent).toContain("flex-direction: column");
    expect(cssContent).toContain("gap: 0.5rem");
  });

  it("retira el bloque marcado y conserva Donar y apoyar en navegación", () => {
    expect(layoutContent).not.toContain("site-footer__about");
    expect(layoutContent).not.toContain("site-footer__mission");
    expect(layoutContent).not.toContain("site-footer__support");
    expect(layoutContent).not.toContain("provenance-stamp");
    expect(layoutContent).not.toContain("Sostenibilidad Ciudadana");
    expect(layoutContent).not.toContain("SupportProjectLink");
    expect(layoutContent).toContain("Donar y apoyar");
  });

  it("el layout global no consulta D1 ni muestra un total consolidado desactualizable", () => {
    expect(layoutContent).not.toContain("getDataPlatformSummary");
    expect(layoutContent).not.toContain("totalRecords.toLocaleString");
  });

  it("móvil: links del footer accesibles", () => {
    expect(cssContent).toContain(".site-footer__link");
    expect(cssContent).toContain("min-height: 38px");
    expect(cssContent).toContain("padding-block: 4px");
  });

  it("barra final legal contiene © 2026, autoría, ImpulsaCV y enlaces de RRSS", () => {
    expect(layoutContent).toContain("© 2026 El Cambiómetro · Información pública verificada");
    expect(layoutContent).toContain("Creado por");
    expect(layoutContent).toContain("Jorge Morgado");
    expect(layoutContent).toContain("https://www.linkedin.com/in/jorge-morgado/");
    expect(layoutContent).toContain("LinkedInIcon");
    expect(layoutContent).toContain("InstagramIcon");
    expect(layoutContent).toContain("XIcon");
    expect(layoutContent).toContain("TikTokIcon");
    expect(layoutContent).toContain("ImpulsaCV");
    expect(layoutContent).toContain("https://impulsacv.cl");
    expect(layoutContent).toContain("https://www.instagram.com/cambiometro/");
    expect(layoutContent).toContain("https://x.com/cambiometro");
    expect(layoutContent).toContain("https://www.tiktok.com/@cambiometro");
  });

  it("desktop (>=1024px) distribuye las dos secciones en columnas equilibradas", () => {
    expect(cssContent).toContain("@media (min-width: 1024px)");
    expect(cssContent).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
  });

  it("pulido home móvil: banda KPI en 2 columnas con último ítem a ancho completo", () => {
    expect(cssContent).toContain(".home-stat:last-child");
    expect(cssContent).toContain("grid-column: 1 / -1");
  });

  it("botón de búsqueda en home usa el token de contraste", () => {
    expect(cssContent).toContain(".home-query button");
    expect(cssContent).toContain("color: var(--on-accent)");
  });
});
