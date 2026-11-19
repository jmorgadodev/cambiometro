import { describe, it, expect } from "vitest";
import { explorerRecord, officialCount, groupExplorerVotes, votingRecordUrl, sessionFromUrl } from "./voting-explorer";
const sample = (chamber = "votaciones_senado") => ({ id: "vote-1", kind: "vote", sourceId: chamber, occurredAt: "2026-01-15", evidence: { sourceUrl: "https://www.senado.cl/actividad-legislativa/sala-de-sesiones/sesiones-de-sala/123", checksumSha256: null, retrievedAt: null, documentPage: null }, data: { descripcion: "Proyecto de ley 18.279-10", total_si: "1", total_no: "0", total_abstencion: "0", resultado: "Aprobado", votos: [{ id: "test-1110", nombre: "Ana Perez Soto", opcion: "Afirmativo" }] } });
describe("adaptación de la herramienta editorial al catálogo público", () => {
    it("incluye enero y todos los meses de 2026, sin convertir ausentes en cero", () => { expect(explorerRecord(sample())?.date).toBe("2026-01-15"); for (const v of [null, undefined, "", "   ", [], {}, false, -1, "abc"])
        expect(officialCount(v)).toBeNull(); expect(officialCount("0")).toBe(0); expect(explorerRecord({ ...sample(), occurredAt: "2025-12-31" })).toBeNull(); });
    it("reconcilia cada votación de ambas cámaras sin inventar nóminas", () => { expect(explorerRecord(sample())).toMatchObject({ nominalStatus: "validated", bulletin: "18279-10", sessionId: "123" }); expect(explorerRecord(sample("camara"))).toMatchObject({ nominalStatus: "validated", nominal: [{name:"Ana Perez Soto"}] }); const r = sample(); r.data.total_si = "2"; expect(explorerRecord(r)).toMatchObject({ nominalStatus: "review", nominal: [] }); });
    it("sesiones contienen sus votaciones y no se atribuyen por un sitio ajeno", () => { expect(sessionFromUrl("https://senado.cl.evil.test/?id_sesion=123", "Senado")).toBeNull(); const a = explorerRecord(sample())!; const groups = groupExplorerVotes([a, { ...a, id: "other" }], "sesiones"); expect(groups).toHaveLength(1); expect(groups[0].rows).toHaveLength(2); expect(groups[0].title).toBe("Sesión 123"); });
    it("usa paginación y consulta todo el rango solicitado en nuestra API", () => { const u = new URL(votingRecordUrl("Cámara", { chamber: "Ambas", from: "2026-01-01", to: "2026-12-31", query: "educación" }, "v1_100"), "https://example.test"); expect(u.pathname).toBe("/api/v1/records"); expect(u.searchParams.get("from")).toBe("2026-01-01"); expect(u.searchParams.get("to")).toBe("2026-12-31"); expect(u.searchParams.get("cursor")).toBe("v1_100"); expect(u.searchParams.get("q")).toBe("educación"); });
});

it("el catálogo específico no mezcla asistencia con votaciones",()=>{const q={chamber:"Ambas" as const,from:"2026-01-01",to:"2026-12-31",query:""};const u=new URL(votingRecordUrl("Cámara",q),"https://example.test");expect(u.searchParams.get("source")).toBe("votaciones_camara");expect(u.searchParams.get("kind")).toBe("vote");expect(explorerRecord({...sample(),kind:"attendance"})).toBeNull();});

for (const chamber of ["camara", "votaciones_senado"]) {
    describe("nómina por registro de " + chamber, () => {
        it("conserva No Vota publicado sin inferir ausencias", () => {
            const r = sample(chamber);
            r.data.votos.push({id:"222",nombre:"Luis López",opcion:"No Vota"});
            expect(explorerRecord(r)).toMatchObject({nominalStatus:"validated",nominal:[{option:"Afirmativo"},{option:"No Vota"}]});
        });
        it("rechaza opciones desconocidas aunque los tres totales coincidan", () => {
            const r = sample(chamber);
            r.data.votos.push({id:"222",nombre:"Luis López",opcion:"Desconocida"});
            expect(explorerRecord(r)).toMatchObject({nominalStatus:"review",nominal:[]});
        });
        it("rechaza identidades duplicadas con distintos identificadores", () => {
            const r = sample(chamber); r.data.total_si="2";
            r.data.votos.push({id:"222",nombre:"ANA PÉREZ SOTO",opcion:"Afirmativo"});
            expect(explorerRecord(r)).toMatchObject({nominalStatus:"review",nominal:[]});
        });
        it("distingue la nómina ausente de una inconsistente", () => {
            const r = sample(chamber); r.data.votos=[];
            expect(explorerRecord(r)).toMatchObject({nominalStatus:"unavailable",nominal:[]});
        });
        it("tolera filas malformadas sin atribuir opciones", () => {
            const r = sample(chamber);
            expect(explorerRecord({...r,data:{...r.data,votos:[...r.data.votos,null]}})).toMatchObject({nominalStatus:"review",nominal:[]});
        });
    });
}

it("reutiliza los DIPID existentes para resolver nombres crudos duplicados en Cámara 91584", () => {
    const r = sample("camara");
    const votes = [
        {id:"815",nombre:"SERGIO BOBADILLA MUÑOZ",opcion:"Afirmativo"},
        {id:"1183",nombre:"SERGIO BOBADILLA MUÑOZ",opcion:"Afirmativo"},
    ];
    expect(explorerRecord({...r,id:"camara-vot-91584",data:{...r.data,total_si:"2",votos:votes}})).toMatchObject({nominalStatus:"validated",nominal:[{id:"815",name:"Sergio Bobadilla Muñoz"},{id:"1183",name:"Flor Weisse Novoa"}]});
});

it("no aplica la identidad de Cámara a un ID coincidente del Senado", () => {
 const r=sample();r.data.votos=[{id:"1186",nombre:"Senador de prueba",opcion:"Afirmativo"}];
 expect(explorerRecord(r)?.nominal[0].name).toBe("Senador de prueba");
});
it("mantiene en revisión un total incompatible después de resolver el DIPID", () => {
 const r=sample("camara");r.data.total_si="2";r.data.votos=[{id:"1186",nombre:"Nombre crudo antiguo",opcion:"Afirmativo"}];
 expect(explorerRecord(r)).toMatchObject({nominalStatus:"review",nominal:[]});
});
