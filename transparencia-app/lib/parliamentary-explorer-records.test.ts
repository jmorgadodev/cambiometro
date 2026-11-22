import { describe, it, expect } from "vitest";
import {detailQuery} from "../components/dashboard/explorer/ExplorerDetail";
import { advisoryRecordFields, selectRecordDetails, recordComponentTotals } from "./parliamentary-explorer-records";
import { explorerDefaults, explorerCsv, type ExplorerData, type ExplorerRecord } from "./parliamentary-explorer";
const data: ExplorerData = { schemaVersion: 1, releaseId: "r", members: [{ id: "d", name: "Ana Pérez", chamber: "camara", regionId: "maule", regionLabel: "Maule", district: "1", profileUrl: "/politico/d" }, { id: "s", name: "Luis Soto", chamber: "senado", regionId: "maule", regionLabel: "Maule", district: null, profileUrl: "/politico/s" }], facts: [], partitions: [], sources: {}, notes: [] };
const row = (id: string, extra: Partial<ExplorerRecord> = {}): ExplorerRecord => ({ id, memberId: "d", period: "2026-04", component: "gastos", category: "Oficinas y servicios", item: "ARRIENDO", amount: 100, recordCount: 1, sourceLabel: "Cámara", sourceScope: "institutional", releaseId: "r", ...extra });
describe("detalle completo investigable", () => {
    it("recupera prestador y folio sin atribuir al informante ni inventar servicio", () => {
        expect(advisoryRecordFields({ Asesor: "FUNDACION JAIME GUZMAN", Diputado: "Bobadilla M., Sergio", Folio: "3668", Monto: "397.823", Doc: "Ver" })).toMatchObject({ providerName: "FUNDACION JAIME GUZMAN", sourceRecordId: "3668" });
        expect(advisoryRecordFields({ Diputado: "Ana Pérez", Monto: "100" }).providerName).toBeUndefined();
        expect(advisoryRecordFields({ Asesor: "Empresa" }).serviceDescription).toBeUndefined();
        expect(advisoryRecordFields({ Asesor: "Empresa", Descripción: "Informe publicado" }).serviceDescription).toBe("Informe publicado");
    });
    it("no trunca, conserva duplicados administrativos y ordena de mayor a menor", () => {
        const rows = Array.from({ length: 61 }, (_, i) => row(String(i), { amount: i === 60 ? null : i }));
        const result = selectRecordDetails(data, rows, {});
        expect(result).toHaveLength(61);
        expect(result[0].amount).toBe(59);
        expect(result.at(-1)?.amount).toBeNull();
        expect(new Set(Array.from({ length: 7 }, (_, p) => result.slice(p * 10, (p + 1) * 10)).flat().map(r => r.id)).size).toBe(61);
    });
    it("filtra cámara, mes, persona, componente, categoría e ítem sin confundir proveedor", () => {
        const rows = [row("a", { providerName: "Consultora Álamo", component: "asesorias" }), row("b", { memberId: "s" }), row("c", { period: "2026-05" }), row("d", { item: "TELEFONIA" })];
        expect(selectRecordDetails(data, rows, { chamber: "camara", period: "2026-04", memberId: "d", component: "asesorias", category: "Oficinas y servicios", item: "ARRIENDO", search: "alamo" }).map(r => r.id)).toEqual(["a"]);
        expect(selectRecordDetails(data, rows, { search: "consultora" })).toHaveLength(1);
        expect(selectRecordDetails(data, rows, { search: "no publicado" })).toHaveLength(0);
    });
    it("no introduce no asociados en selecciones individuales ni suma componentes", () => {
        const rows = [row("a"), row("b", { component: "personal", amount: 200 }), row("orphan", { memberId: "unknown", amount: 999 })];
        expect(selectRecordDetails(data, rows, { memberId: "d" })).toHaveLength(2);
        expect(recordComponentTotals(rows.slice(0, 2))).toMatchObject({ gastos: { amount: 100, records: 1 }, personal: { amount: 200, records: 1 } });
        expect(recordComponentTotals([row("n", { amount: null }), row("z", { component: "personal", amount: 0 })])).toMatchObject({ gastos: { amount: null }, personal: { amount: 0 } });
    });
    it("CSV conserva prestador, concepto, descripción, campos originales y todos los registros", () => {
        const text = explorerCsv(data, [row("a", { component: "asesorias", providerName: "Consultora", serviceDescription: "Informe", originalConcept: "Servicio publicado", originalDescription: "Detalle original", sourceFields: { Asesor: "Consultora" }, sourceRecordId: "3668" })]);
        for (const value of ["Prestador publicado", "Consultora", "Informe", "Servicio publicado", "Detalle original", "3668"])
            expect(text).toContain(value);
    });
});

it("el detalle de un subtotal restringe su componente y la ficha general los conserva separados",()=>{
 const q={...explorerDefaults(data),metricComponent:"asesorias" as const};
 for(const context of [{kind:"region" as const,id:"maule"},{kind:"category" as const,id:"Asesorías externas"},{kind:"item" as const,id:"Contratos externos"},{kind:"period" as const,id:"2026-04"}])expect(detailQuery(q,context).componentIds).toEqual(["asesorias"]);
 expect(detailQuery(q,{kind:"team",id:"d"}).componentIds).toEqual(["personal"]);
 expect(detailQuery(q,{kind:"member",id:"d"}).componentIds).toEqual(q.componentIds);
 expect(detailQuery(q,{kind:"member",id:"d",component:"gastos"}).componentIds).toEqual(["gastos"]);
});
