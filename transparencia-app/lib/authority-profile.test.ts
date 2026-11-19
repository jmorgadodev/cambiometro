import {describe,expect,it} from "vitest";
import {authoritySections,resolveAuthoritySection,latestProfileAmount} from "./authority-profile";
describe("navegación de la ficha",()=>{
  const all=authoritySections({hasElectionData:true,hasExternalAdvisories:true});
  it("abre resumen y conserva los enlaces anteriores",()=>{
    expect(resolveAuthoritySection("",all).id).toBe("resumen");
    expect(resolveAuthoritySection("#seccion-gastos",all).id).toBe("gastos");
    expect(resolveAuthoritySection("#costo-mensual",all).id).toBe("dieta");
    expect(resolveAuthoritySection("#bloque-formacion-dip",all).id).toBe("antecedentes");
    expect(resolveAuthoritySection("#seccion-lobby",all).id).toBe("antecedentes");
  });
  it("oculta opciones sin datos y resuelve hashes ajenos o mal formados",()=>{
    const sections=authoritySections({hasElectionData:false,hasExternalAdvisories:false});
    expect(sections.some(s=>s.id==="eleccion"||s.id==="asesorias")).toBe(false);
    for(const hash of ["#seccion-electoral","#asesorias-externas","#no-existe","#%E0%A4%A"]){expect(resolveAuthoritySection(hash,sections).id).toBe("resumen");}
  });
  it("cada apartado tiene destino único y descripción propia",()=>{
    expect(new Set(all.map(s=>s.href)).size).toBe(all.length);
    expect(all.every(s=>s.description.length>0)).toBe(true);
  });
});
describe("componentes financieros del resumen",()=>{
  it("conserva el mes de cada componente y no convierte un vacío reciente en cero",()=>{
    const months=[{periodo:"2026-08",gastos:6834219,personal:100},{periodo:"2026-09",gastos:null,personal:120}];
    expect(latestProfileAmount(months,"gastos")).toEqual({amount:6834219,period:"2026-08"});
    expect(latestProfileAmount(months,"personal")).toEqual({amount:120,period:"2026-09"});
  });
  it("un cero explícito se distingue de ausencia y no se inventa un período",()=>{
    expect(latestProfileAmount([{periodo:"2026-09",personal:0}],"personal")).toEqual({amount:0,period:"2026-09"});
    expect(latestProfileAmount([{periodo:"no informado",gastos:10},{periodo:"2026-09",gastos:null}],"gastos")).toEqual({amount:null,period:null});
  });
});
