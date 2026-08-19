import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = join(import.meta.dirname, "..");

describe("política de datos públicos", () => {
  it("no conserva presupuestos, dotaciones ni alertas demo en las semillas publicables", () => {
    const municipalidades = readFileSync(join(projectRoot, "lib", "municipalidades.ts"), "utf8");
    const servicios = readFileSync(join(projectRoot, "lib", "servicios-publicos.ts"), "utf8");
    const funcionarios = readFileSync(join(projectRoot, "lib", "funcionarios-source.ts"), "utf8");

    expect(municipalidades).not.toMatch(/presupuesto_municipal_clp\s*:\s*\d/);
    expect(municipalidades).not.toMatch(/alertas_cgr\s*:\s*\d/);
    expect(servicios).not.toMatch(/presupuesto_anual_clp\s*:\s*\d/);
    expect(servicios).not.toMatch(/dotacion_personal\s*:\s*\d/);
    expect(funcionarios).not.toMatch(/"rut"\s*:/);
    expect(funcionarios).not.toMatch(/alerta_parentesco_politico/);
  });

  it("no mantiene scripts capaces de fabricar RUT", () => {
    const packageJson = readFileSync(join(projectRoot, "package.json"), "utf8");
    expect(packageJson).not.toContain("scrape-portal-nomina");
    expect(() => readFileSync(join(projectRoot, "scripts", "scrape-portal-nomina.mjs"), "utf8")).toThrow();
  });

  it("no clasifica conflictos o riesgos mediante coincidencias de nombres", () => {
    const crucesPage = readFileSync(join(projectRoot, "app", "cruces", "page.tsx"), "utf8");

    expect(crucesPage).not.toContain("generarCrucesPorComuna");
    expect(crucesPage).not.toContain("Posibles Conflictos de Interés");
    expect(crucesPage).not.toContain("nivelRiesgo");
    expect(() => readFileSync(join(projectRoot, "lib", "cruces.ts"), "utf8")).toThrow();
  });
});
