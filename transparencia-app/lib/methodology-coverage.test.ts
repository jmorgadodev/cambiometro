import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("política pública de cobertura", () => {
  it("distingue procedencia, completitud y ausencia sin inferir irregularidades", () => {
    const page = readFileSync("app/como-funciona/page.tsx", "utf8");
    for (const text of ["Fuente oficial no significa conjunto completo", "Cobertura no medida", "no prueba que la fuente no lo haya publicado", "no prueban causalidad ni irregularidad"]) {
      expect(page.includes(text), text).toBe(true);
    }
  });
});
