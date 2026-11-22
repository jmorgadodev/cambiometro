import { describe, it, expect } from "vitest";
import { normativePanelPresentation } from "./parliamentary-normative-presentation";
import { NORMATIVE_CATALOG } from "./parliamentary-normative";
describe("presentación ciudadana, catálogo inmutable", () => {
    it("usa una sola versión y no añade reglas transversales a conceptos específicos", () => {
        const p = normativePanelPresentation({ component: "gastos", items: ["TRASLACION VEHICULO", "ARRIENDO OFICINAS"], from: "2026-04", to: "2026-04" });
        expect(p.definitions.map(d => d.id)).toEqual(["oficinas", "vehiculos"]);
        expect(new Set(p.definitions.map(d => d.versionId)).size).toBe(1);
        expect(p.definitions.some(d => d.id === "general")).toBe(false);
        expect(p.definitions.flatMap(d => d.excluded).join(" ")).not.toMatch(/donaciones|actividades electorales/i);
    });
    it("sin fecha prioriza la última versión, sin eliminar el historial", () => {
        const p = normativePanelPresentation({ conceptIds: ["comunicacion"] });
        expect(p.definitions).toHaveLength(1);
        expect(p.definitions[0].versionId).toBe("crap-res-12");
        expect(NORMATIVE_CATALOG.versions).toHaveLength(2);
    });
    it("para fechas históricas elige la versión aplicable, sin sustituirla por la nueva", () => {
        expect(normativePanelPresentation({ conceptIds: ["vehiculos"], from: "2026-02" }).definitions[0].versionId).toBe("crap-res-11");
        expect(normativePanelPresentation({ conceptIds: ["vehiculos"], from: "2024-01" }).definitions).toHaveLength(0);
    });
    it("señala el cambio sin superponer versiones o atribuir marzo entero a la posterior", () => {
        const p = normativePanelPresentation({ conceptIds: ["comunicacion"], from: "2026-03", to: "2026-03" });
        expect(p.transition).toBe(true);
        expect(p.displayedVersion?.validFrom).toBe("2026-03-11");
        expect(p.definitions).toHaveLength(1);
    });
    it("conserva exclusiones y excepciones específicas sin bibliografía en las condiciones", () => {
        const p = normativePanelPresentation({ conceptIds: ["comunicacion", "telefonia", "personal"], from: "2026-04" });
        expect(p.definitions.find(d => d.id === "telefonia")?.excluded.join(" ")).toContain("viajes oficiales del parlamentario");
        expect(p.definitions.find(d => d.id === "comunicacion")?.restrictions.join(" ")).toContain("dos años calendario");
        expect(p.definitions.flatMap(d => d.restrictions).join(" ")).not.toMatch(/VI\.D|VI\.A|II\.10/);
        expect(p.definitions.find(d => d.id === "personal")?.restrictions.join(" ")).toContain("honorarios son excepcionales");
    });
});
