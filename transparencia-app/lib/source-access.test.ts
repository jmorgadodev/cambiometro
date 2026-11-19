import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import SourceLink from "@/components/data/SourceLink";
import { describe, it, expect } from "vitest";
import { officialReference, sourceAccessDestination } from "./source-access";
describe("accesos oficiales centralizados", () => {
    it("conserva URL y parámetros de evidencia en Fuentes", () => { const u = "https://www.camara.cl/detalle?id=1110&mes=2026-09"; expect(new URL(sourceAccessDestination(u)!, "https://example.test").searchParams.get("referencia")).toBe(u); });
    it("no deriva redes personales, anclas ni autoría a fuentes", () => { for (const u of ["#seccion-gastos", "/votaciones/", "mailto:a@camara.cl", "https://x.com/autoridad", "https://jmorgado.pages.dev/"])
        expect(sourceAccessDestination(u)).toBe(u); });
    it("rechaza esquemas, dominios suplantados y credenciales", () => { for (const u of ["javascript:alert(1)", "https://camara.cl.evil.test/", "https://user@senado.cl/", "https://evil.test/?x=camara.cl"])
        expect(officialReference(u)).toBeNull(); expect(officialReference("http://www.bcn.cl/")).toBe("https://www.bcn.cl/"); });
});

describe("enlace de evidencia renderizado",()=>{it("la operación permanece en el sitio y la referencia no desaparece",()=>{const html=renderToStaticMarkup(createElement(SourceLink,{href:"https://www.senado.cl/detalle/1",download:true,target:"_blank",rel:"noopener noreferrer"},"Abrir oficial"));expect(html).toContain('href="/fuentes/?referencia=https%3A%2F%2Fwww.senado.cl%2Fdetalle%2F1"');expect(html).toContain("Fuentes y alcance");expect(html).not.toContain('target="_blank"');expect(html).not.toContain("download=");});});
