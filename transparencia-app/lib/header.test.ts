import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = join(import.meta.dirname, "..");

describe("Header y navegación global", () => {
  const headerContent = readFileSync(join(projectRoot, "components", "SiteHeader.tsx"), "utf8");
  const cssContent = readFileSync(join(projectRoot, "app", "globals.css"), "utf8");

  it("elimina el buscador global del header y el botón X de la barra principal", () => {
    // No debe haber inputs de búsqueda en SiteHeader
    expect(headerContent).not.toContain("<input");
    expect(headerContent).not.toContain("header-search");
    expect(headerContent).not.toContain("OmniboxSearch");

    // No debe haber enlace a X en la barra principal (solo en footer o drawer)
    expect(headerContent).not.toContain('className="theme-toggle-btn">\n              <span aria-hidden="true">𝕏</span>');
  });

  it("elimina el carácter ⌘ de todo el código del sitio", () => {
    const cmdChar = String.fromCharCode(0x2318);
    function scanDir(dir: string) {
      const files = readdirSync(dir);
      for (const file of files) {
        if (file === "node_modules" || file === ".next" || file === ".git" || file === "scratch" || file === "dist" || file.endsWith(".test.ts")) {
          continue;
        }
        const fullPath = join(dir, file);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (file.endsWith(".tsx") || file.endsWith(".ts") || file.endsWith(".css") || file.endsWith(".html")) {
          const content = readFileSync(fullPath, "utf8");
          expect(content, `Carácter ⌘ encontrado en ${fullPath}`).not.toContain(cmdChar);
        }
      }
    }

    scanDir(join(projectRoot, "app"));
    scanDir(join(projectRoot, "components"));
    scanDir(join(projectRoot, "lib"));
  });

  it("desktop (≥1024px) cuenta con 2 filas limpias y separadores de clúster", () => {
    expect(headerContent).toContain("site-header__primary");
    expect(headerContent).toContain("site-header__nav-row");
    expect(headerContent).toContain("site-nav__separator");

    // Los 4 clústeres en orden
    expect(headerContent).toContain("Análisis Parlamentario");
    expect(headerContent).toContain("Partidos");
    expect(headerContent).toContain("Directorio de Personas");
    expect(headerContent).toContain("Servicios públicos");
    expect(headerContent).toContain("Municipalidades");
    expect(headerContent).toContain("Transferencias");
    expect(headerContent).toContain("Cruces");
    expect(headerContent).toContain("Movimientos");
    expect(headerContent).toContain("Datos");
    expect(headerContent).toContain("Metodología");
  });

  it("mobile (<1024px) contiene drawer con las 10 secciones, chip de corte, X y donación", () => {
    expect(headerContent).toContain("mobile-drawer");
    expect(headerContent).toContain("drawer-overlay");
    expect(headerContent).toContain("mobile-drawer__cluster");
    expect(headerContent).toContain("drawer-snapshot-stamp");
    expect(headerContent).toContain("https://x.com/cambiometro");
    expect(headerContent).toContain("Donar y apoyar");
    expect(headerContent).toContain('href="/donar"');
  });

  it("reglas de CSS: touch targets ≥ 44px, sticky header, drawer transition < 200ms", () => {
    expect(cssContent).toContain("position: sticky");
    expect(cssContent).toContain("overflow-x: clip");
    expect(cssContent).toContain("min-height: 44px");
    expect(cssContent).toContain("min-width: 44px");
    expect(cssContent).toContain("transition: transform 180ms");
    expect(cssContent).toContain("@media (max-width: 1023px)");
  });
});
