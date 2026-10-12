import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AuthoritySectionNav from "../components/politico/AuthoritySectionNav";

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
    expect(page).toContain('className={`politico-layout ${');
    expect(css).toMatch(/@media \(max-width: 850px\)[\s\S]*\.politico-layout \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  });

  it("expande y redistribuye los gastos cuando la ficha no tiene resultado electoral 2025", () => {
    const expenses = readFileSync(resolve("app/politico/[id]/gastos-mensuales.tsx"), "utf8");

    expect(page).toContain('politico-layout--without-2025-result');
    expect(expenses).toContain('className="authority-expenses-period"');
    expect(expenses).toContain('className="authority-expenses-items"');
    expect(css).toMatch(/\.politico-layout--without-2025-result \.authority-expenses-card\s*\{[^}]*grid-column:\s*1 \/ -1/);
    expect(css).toMatch(/\.politico-layout--without-2025-result \.authority-expenses-items\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
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

  it("integra datos oficiales de Cámara en la ficha y presenta asesorías en un módulo separado", () => {
    const chamberProfile = readFileSync(resolve("components/politico/CamaraOfficialProfileDetails.tsx"), "utf8");
    const chamberRecords = readFileSync(resolve("components/politico/CamaraTransparencyDetails.tsx"), "utf8");
    expect(page).not.toContain("Ficha oficial de la Cámara");
    expect(page).toContain("fichaCamara:");
    expect(page).toContain("CamaraTransparencyDetails");
    expect(page).toContain("externalAdvisoryAmountsByPeriod");
    expect(chamberProfile).toContain('label: "Comunas"');
    expect(chamberProfile).toContain('label: "Períodos parlamentarios"');
    expect(chamberProfile).toContain("Partido según Cámara");
    expect(chamberProfile).toContain("Contacto");
    expect(chamberRecords).toContain("asesoriaexterna.aspx");
    expect(chamberRecords).toContain('id="asesorias-externas"');
    expect(chamberRecords).toContain("subtotal publicado");
    expect(chamberRecords).not.toContain("pasajesaereos.aspx");
    expect(chamberRecords).not.toContain("instanciainternacionales.aspx");
    expect(chamberRecords).not.toContain("audiencia.aspx");
  });

  it("no enlaza una sección electoral cuando la ficha no tiene votos publicados", () => {
    const withoutElection = renderToStaticMarkup(createElement(AuthoritySectionNav, { hasElectionData: false }));
    const withElection = renderToStaticMarkup(createElement(AuthoritySectionNav, { hasElectionData: true, hasExternalAdvisories: true }));

    expect(withoutElection).not.toContain('href="#seccion-electoral"');
    expect(withElection).toContain('href="#seccion-electoral"');
    expect(withoutElection).not.toContain('href="#asesorias-externas"');
    expect(withElection).toContain('href="#asesorias-externas"');
    expect(withoutElection).toContain('href="#seccion-gastos"');
  });
});
