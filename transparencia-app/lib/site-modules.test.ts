import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ACTIVE_MODULES, CONSTRUCTION_MODULES, activeModuleForPath } from "./site-modules";
import ModuleUnderConstruction from "../components/ModuleUnderConstruction";
describe("alcance público acordado", () => {
  it("publica sólo las seis áreas acordadas en el orden de navegación", () => {
    expect(ACTIVE_MODULES.map((item) => item.label)).toEqual(["Cámara", "Partidos", "Votaciones", "Movimientos", "Datos", "Metodología"]);
    expect(new Set([...ACTIVE_MODULES, ...CONSTRUCTION_MODULES].map((item) => item.href)).size).toBe(19);
    expect(activeModuleForPath("/politico/alguien/")?.id).toBe("camara");
  });
  it.each(CONSTRUCTION_MODULES)("mantiene $href seleccionable con aviso y alternativas activas", (item) => {
    const html = renderToStaticMarkup(createElement(ModuleUnderConstruction, { moduleId: item.id }));
    expect(html).toContain(item.label + " está en construcción");
    for (const active of ACTIVE_MODULES) expect(html).toContain('href="' + active.href + '"');
  });
});
