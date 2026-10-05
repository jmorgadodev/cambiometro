import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("política pública de cobertura", () => {
  it("distingue procedencia, completitud y ausencia sin inferir irregularidades", () => {
    const page = readFileSync("app/como-funciona/page.tsx", "utf8");
    for (const text of ["Fuente oficial no significa conjunto completo", "Cobertura no medida", "no prueba que la fuente no lo haya publicado", "no prueban causalidad ni irregularidad"]) {
      expect(page.includes(text), text).toBe(true);
    }
  });
  it("describe la selección cronológica real de la portada", () => {
    const page = readFileSync("app/como-funciona/page.tsx", "utf8");
    expect(page.includes("las tres votaciones más recientes del Senado disponibles en el corte publicado")).toBe(true);
    expect(page.includes("La selección destacada prioriza impacto institucional")).toBe(false);
  });
});
