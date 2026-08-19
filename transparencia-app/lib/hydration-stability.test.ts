import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("render determinista entre Worker y navegador", () => {
  it("no interpreta fechas ISO de movimientos en la zona horaria local", () => {
    const source = fs.readFileSync(path.resolve("app", "movimientos", "page.tsx"), "utf8");
    expect(source).not.toContain("new Date(mov.fecha)");
  });

  it("no ordena las opciones iniciales con collation dependiente del runtime", () => {
    const source = fs.readFileSync(path.resolve("components", "GlobalFuncionariosClient.tsx"), "utf8");
    expect(source).not.toMatch(/sort\([^\n]+localeCompare/);
  });
});
