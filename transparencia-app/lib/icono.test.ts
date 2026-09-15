import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const iconSource = readFileSync(
  new URL("../components/ui/Icono.tsx", import.meta.url),
  "utf8",
);

describe("iconografía propia del Cambiómetro", () => {
  it("conserva el contrato de nombres y las utilidades compartidas", () => {
    expect(iconSource).toContain('"organismo"');
    expect(iconSource).toContain('"votaciones"');
    expect(iconSource).toContain('"personas"');
    expect(iconSource).toContain('"territorio"');
    expect(iconSource).toContain('"cruces"');
    expect(iconSource).toContain('"search"');
    expect(iconSource).toContain('"menu"');
    expect(iconSource).toContain('"close"');
  });

  it("expresa la firma visual documental en los glifos de dominio", () => {
    expect(iconSource).toContain("instrumento de evidencia");
    expect(iconSource).toContain("constelación de identidades relacionadas");
    expect(iconSource).toContain("grafo documental con nodo de evidencia central");
    expect(iconSource).toContain("escudo con dial de verificación");
  });
});
