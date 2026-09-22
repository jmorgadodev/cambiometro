import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("contenido verificable de la ficha política", () => {
  const page = readFileSync(resolve("app/politico/[id]/page.tsx"), "utf8");
  const css = readFileSync(resolve("app/globals.css"), "utf8");

  it("muestra los nombres y cargos publicados del personal de apoyo con orden alfabetico", () => {
    const personalComp = readFileSync(resolve("components/PersonalApoyoMensual.tsx"), "utf8");
    expect(page).toContain("PersonalApoyoMensual");
    expect(personalComp).toContain("f.nombre");
    expect(personalComp).toContain("f.cargo");
    expect(personalComp).toContain("localeCompare");
  });



  it("apila la ficha en pantallas moviles sin mantener una columna fija", () => {
    expect(page).toContain('className="politico-layout"');
    expect(css).toMatch(/@media \(max-width: 850px\)[\s\S]*\.politico-layout \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  });

  it("aplica el expediente editorial y mantiene accesos directos a sus secciones", () => {
    const sectionNav = readFileSync(resolve("components/politico/AuthoritySectionNav.tsx"), "utf8");

    expect(page).toContain("AuthoritySectionNav");
    expect(page).toContain('className="politico-editorial-profile"');
    expect(page).toContain('id="seccion-gastos"');
    expect(page).toContain('id="seccion-asesores"');
    expect(page).toContain('id="seccion-votaciones"');
    expect(sectionNav).toContain("Gastos rendidos");
    expect(sectionNav).toContain("Personal y asesores");
    expect(css).toContain(".authority-section-nav");
  });
});
