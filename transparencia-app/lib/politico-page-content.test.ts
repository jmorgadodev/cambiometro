import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AuthoritySectionNav from "../components/politico/AuthoritySectionNav";
import AuthorityProfile from "../components/politico/AuthorityProfile";
import { authoritySections } from "./authority-profile";

describe("contenido verificable de la ficha política", () => {
  const page = readFileSync(resolve("app/politico/[id]/page.tsx"), "utf8");
  const css = readFileSync(resolve("components/politico/AuthorityProfile.module.css"), "utf8");

  it("muestra los nombres y cargos publicados del personal de apoyo con orden alfabetico", () => {
    const personalComp = readFileSync(resolve("components/PersonalApoyoMensual.tsx"), "utf8");
    expect(page).toContain("PersonalApoyoMensual");
    expect(personalComp).toContain("f.nombre");
    expect(personalComp).toContain("f.cargo");
    expect(personalComp).toContain("localeCompare");
  });



  it("conserva todos los detalles como contenido de servidor y ofrece enlaces a sus paneles", () => {
    const sections=authoritySections({hasElectionData:true,hasExternalAdvisories:true});
    const content=Object.fromEntries(sections.map(s=>[s.id,createElement("div",{id:s.href.slice(1)},"Detalle de "+s.label)]));
    const html=renderToStaticMarkup(createElement(AuthorityProfile,{sections,content}));
    for(const section of sections){
      expect(html.includes(`href="${section.href}"`)).toBe(true);
      expect(html.includes("Detalle de "+section.label)).toBe(true);
    }
    expect(html.includes('aria-label="Apartado de la ficha"')).toBe(true);
    expect(css.includes('@media (max-width:850px)')).toBe(true);
  });

  it("aplica el expediente editorial y mantiene accesos directos a sus secciones", () => {
    const sectionNav = readFileSync(resolve("lib/authority-profile.ts"), "utf8");

    expect(page.includes("AuthorityProfile")).toBe(true);
    expect(page).toContain('className="politico-editorial-profile"');
    expect(page).toContain('id="seccion-gastos"');
    expect(page).toContain('id="seccion-asesores"');
    expect(page).toContain('id="seccion-votaciones"');
    expect(sectionNav).toContain("Gastos rendidos");
    expect(sectionNav).toContain("Personal y asesores");
    expect(css.includes(".navigation")).toBe(true);
  });

  it("integra datos oficiales de Cámara en la ficha y presenta asesorías en un módulo separado", () => {
    const chamberProfile = readFileSync(resolve("components/politico/CamaraOfficialProfileDetails.tsx"), "utf8");
    const chamberRecords = readFileSync(resolve("components/politico/CamaraTransparencyDetails.tsx"), "utf8");
    expect(page).not.toContain("Ficha oficial de la Cámara");
    expect(page).toContain("fichaCamara:");
    expect(page).toContain("CamaraTransparencyDetails");
    expect(page).toContain("externalAdvisoryAmountsByPeriod");
    expect(chamberProfile).toContain('label: "Comunas del distrito"');
    expect(chamberProfile).toContain('label: "Períodos parlamentarios publicados"');
    expect(chamberProfile).toContain("Partido publicado por Cámara");
    expect(chamberProfile).toContain("Contacto oficial");
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
