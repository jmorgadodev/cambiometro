import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("presentación agregada de DIPRES", () => {
  it("separa el directorio institucional de los datos presupuestarios agregados", () => {
    const page = readFileSync(resolve(import.meta.dirname, "../app/servicios-publicos/page.tsx"), "utf8");
    const client = readFileSync(resolve(import.meta.dirname, "../app/servicios-publicos/servicios-publicos-client.tsx"), "utf8");

    expect(page).toContain("dipresCoverage");
    expect(client).toContain("DIPRES · datos agregados");
    expect(client).toContain("No corresponde a un buscador de sueldos ni a fichas de pagos personales.");
    expect(client).toContain("Catálogo de la fuente");
    expect(client).toContain("cobertura pendiente");
  });
});
