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

  it("divide cada fila una vez y filtra año y organismo sin parsear de nuevo", () => {
    const source = readFileSync(new URL("../stream-remote-personal.mjs", import.meta.url), "utf8");
    const splitOnce = source.indexOf("const columns = parseCpltLine(line)");
    const yearPrefilter = source.indexOf('getCpltColumn(columns, header, "anyo", "año")');
    const municipalityPrefilter = source.indexOf('getCpltColumn(columns, header, "organismo_nombre", "organismo nombre")');
    const fullParse = source.indexOf("parseCpltColumns(line)");

    expect(splitOnce).toBeGreaterThan(-1);
    expect(yearPrefilter).toBeGreaterThan(-1);
    expect(yearPrefilter).toBeGreaterThan(splitOnce);
    expect(municipalityPrefilter).toBeGreaterThan(yearPrefilter);
    expect(fullParse).toBe(-1);
  });
});
