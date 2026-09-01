import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCpltHeader, scanCpltCell } from "../cplt-personal.mjs";

describe("prefiltro acotado de nóminas CPLT", () => {
  it("lee una columna puntual sin materializar todas las columnas", () => {
    const header = parseCpltHeader("nombres;anyo;organismo_nombre;descripcion_funcion");
    const line = "Ana;2026;Municipalidad de Maipú;Profesional";

    expect(scanCpltCell(line, header, "anyo", "año")).toBe("2026");
    expect(scanCpltCell(line, header, "organismo_nombre", "organismo nombre")).toBe("Municipalidad de Maipú");
    expect(scanCpltCell(line, header, "campo_inexistente")).toBe("");
  });

  it("prefiltra año y organismo antes de dividir la fila completa", () => {
    const source = readFileSync(new URL("../stream-remote-personal.mjs", import.meta.url), "utf8");
    const yearPrefilter = source.indexOf('scanCpltCell(line, header, "anyo", "año")');
    const municipalityPrefilter = source.indexOf('scanCpltCell(line, header, "organismo_nombre", "organismo nombre")');
    const fullParse = source.indexOf("parseCpltColumns(line)");

    expect(yearPrefilter).toBeGreaterThan(-1);
    expect(municipalityPrefilter).toBeGreaterThan(yearPrefilter);
    expect(fullParse).toBeGreaterThan(municipalityPrefilter);
  });
});
