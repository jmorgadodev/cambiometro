import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { tituloVotacionLegible } from "./votaciones-format";

describe("interfaz de votaciones destacadas", () => {
  const client = readFileSync(resolve(import.meta.dirname, "../components/VotacionesDestacadasClient.tsx"), "utf8");

  it("ofrece un filtro explícito por cámara con Senado como selección inicial", () => {
    expect(client).toContain('useState<"Cámara" | "Senado">("Senado")');
    expect(client).toContain('aria-label="Filtrar por cámara"');
    expect(client).toContain("Cámara");
    expect(client).toContain("Senado");
  });

  it("describe el boletín sin repetir una etiqueta genérica como título", () => {
    expect(client).toContain("tituloVotacionLegible(entry, detail?.tipo)");
    const source = readFileSync(resolve(import.meta.dirname, "./votaciones-format.ts"), "utf8");
    expect(source).toContain('"Votación de proyecto"');
    expect(source).toContain("Boletín N°");
    expect(tituloVotacionLegible({ titulo: "Votación registrada del Boletín N° 17324-33", boletin: "17324-33" }, "Proyecto de Ley"))
      .toBe("Proyecto de Ley · Boletín N° 17324-33");
  });
});
