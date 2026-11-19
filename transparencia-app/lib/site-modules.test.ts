import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {createElement} from "react";
import {ACTIVE_MODULES,CONSTRUCTION_MODULES,activeModuleForPath} from "./site-modules";

describe("alcance público y avances consultables",()=>{
  it("conserva las seis áreas principales",()=>{
    expect(ACTIVE_MODULES.map(item=>item.label)).toEqual(["Cámara","Partidos","Votaciones","Movimientos","Datos","Metodología"]);
    expect(new Set([...ACTIVE_MODULES,...CONSTRUCTION_MODULES].map(item=>item.href)).size).toBe(19);
    expect(activeModuleForPath("/politico/alguien/")?.id).toBe("camara");
    expect(activeModuleForPath("/votaciones/proyectos/")?.id).toBe("votaciones");
    expect(activeModuleForPath("/votaciones-destacadas/")?.id).toBe("votaciones");
  });
  it.each(CONSTRUCTION_MODULES)("$href conserva aviso y contenido original",async item=>{
    const Layout=(await import(`../app/${item.href.slice(1)}/layout.tsx`)).default;
    const html=renderToStaticMarkup(createElement(Layout,{},createElement("h1",{},"Avance consultable")));
    expect(html).toContain(item.label+" está en construcción");
    expect(html).toContain("Avance consultable");
    expect(html).toContain('role="note"');
    expect(html).toContain('href="/datos"');
  });
});
