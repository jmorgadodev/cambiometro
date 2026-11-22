import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import PersonalApoyoMensual from "../components/PersonalApoyoMensual";
import { NORMATIVE_CATALOG } from "./parliamentary-normative";
import { evaluateSenateSupport } from "../scripts/etl/senado-assignment.mjs";
const rows = [
    { periodo: "2026-04", nombre: "MARIA PAZ", apellido_paterno: "KING", apellido_materno: "SUAU", cargo: "APOYO ADMINISTRATIVO", monto: 6045364, calidad_juridica: "INDEFINIDO" },
    { periodo: "2026-04", nombre: "NATALIA MAGALY", apellido_paterno: "PEREZ", apellido_materno: "CERDA", cargo: "ASESOR (A) LEGISLATIVO", monto: 3574412, calidad_juridica: "INDEFINIDO" },
    { periodo: "2026-04", nombre: "OMAR MAURICIO", apellido_paterno: "MATURANA", apellido_materno: "LABARCA", cargo: "CONDUCTOR", monto: 1931307, calidad_juridica: "INDEFINIDO" },
    { periodo: "2026-04", nombre: "SUSANA ANYELINA", apellido_paterno: "COLLAO", apellido_materno: "RAMOS", cargo: "SECRETARIA (O) DE PARLAMENTARIO", monto: 1806479, calidad_juridica: "INDEFINIDO" },
];
describe("alcance jurídico de condiciones especiales", () => {
    it("revisa veinte definiciones con referencias y modalidades explícitas", () => {
        expect(NORMATIVE_CATALOG.definitions).toHaveLength(20);
        for (const d of NORMATIVE_CATALOG.definitions) {
            expect(d.conditions.length).toBeGreaterThan(0);
            for (const c of d.conditions) {
                expect(c.title).toBeTruthy();
                expect(c.scope).toBeTruthy();
                expect(c.references.length).toBeGreaterThan(0);
            }
        }
    });
    it("el 25 % se aplica al conjunto de expertos, no a cargos ni salarios individuales", () => {
        for (const d of NORMATIVE_CATALOG.definitions.filter(d => d.id === "personal")) {
            const c = d.conditions.find(c => c.id === "expertos")!;
            expect(c.scope).toBe("expert_contracts_only");
            expect(c.text).toContain("conjunto");
            expect(c.text).toContain("reasignaciones autorizadas");
            expect(c.text).toContain("no es un tope salarial individual");
            expect(c.text).toContain("administrativo");
            expect(c.text).toContain("profesional");
            expect(c.text).toContain("técnico");
            expect(c.text).toContain("cargo publicado");
        }
    });
    it("no traslada topes de 2026 a la versión histórica", () => {
        const old = NORMATIVE_CATALOG.definitions.filter(d => d.versionId === "crap-res-11"), now = NORMATIVE_CATALOG.definitions.filter(d => d.versionId === "crap-res-12");
        expect(old.find(d => d.id === "desplazamientos")?.restrictions.join(" ")).not.toContain("60 %");
        expect(now.find(d => d.id === "desplazamientos")?.restrictions.join(" ")).toContain("60 %");
        expect(old.find(d => d.id === "vehiculos")?.restrictions.join(" ")).not.toContain("$2.000.000");
        expect(now.find(d => d.id === "vehiculos")?.restrictions.join(" ")).toContain("$2.000.000");
    });
    it("Ossandón: conserva las cuatro observaciones sin evaluar cumplimiento desde la base", () => {
        const before = JSON.stringify(rows), total = rows.reduce((s, r) => s + r.monto, 0);
        expect(total).toBe(13357562);
        const evaluation = evaluateSenateSupport({ total_clp: total, period: "2026-04", base_mensual_clp: 11406149, verified_transfers: [] });
        const html = renderToStaticMarkup(createElement(PersonalApoyoMensual, { cargo: "Senador", mesesDisponibles: [{ periodo: "2026-04", etiqueta: "Abril 2026" }], ultimoPeriodo: "2026-04", senadorPersonal: { registros: rows, ultimo_mes: "2026-04", asignacion: { year: 2026, base_mensual_clp: 11406149, acumulable: false, max_transfer_gastos_operacionales_pct: 40, max_transfer_asesoria_externa_clp: 1230467, transfer_asesoria_desde: "2026-03-11", source_url: "https://www.senado.cl/transparencia/", retrieved_at: "2026-11-22T00:00:00Z", checksum_sha256: "a".repeat(64), transferencias_acreditadas: [] }, evaluaciones: { "2026-04": evaluation } } }));
        for (const amount of ["6.045.364", "3.574.412", "1.931.307", "1.806.479", "13.357.562"])
            expect(html).toContain(amount);
        for (const name of ["KING SUAU MARIA PAZ", "PEREZ CERDA NATALIA MAGALY", "APOYO ADMINISTRATIVO", "ASESOR (A) LEGISLATIVO"])
            expect(html).toContain(name);
        expect(html).not.toContain("JEFA DE GABINETE");
        expect(html).not.toContain("25 %");
        expect(html).not.toContain("Experto");
        expect(html).not.toMatch(/Hallazgo de integridad|Exceso de|diferencia sin respaldo|role="alert"|tope salarial individual/);
        expect(JSON.stringify(rows)).toBe(before);
    });
});
