import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCpltHeader, parseCpltRecord, scanCpltCell } from "../cplt-personal.mjs";

describe("prefiltro acotado de nóminas CPLT", () => {
  it("lee una columna puntual sin materializar todas las columnas", () => {
    const header = parseCpltHeader("nombres;anyo;organismo_nombre;descripcion_funcion");
    const line = "Ana;2026;Municipalidad de Maipú;Profesional";

    expect(scanCpltCell(line, header, "anyo", "año")).toBe("2026");
    expect(scanCpltCell(line, header, "organismo_nombre", "organismo nombre")).toBe("Municipalidad de Maipú");
    expect(scanCpltCell(line, header, "campo_inexistente")).toBe("");
  });

  it("prefiltra año y ámbito del organismo antes de dividir la fila completa", () => {
    const source = readFileSync(new URL("../stream-remote-personal.mjs", import.meta.url), "utf8");
    const yearPrefilter = source.indexOf('scanCpltCell(line, header, "anyo", "año")');
    const organizationPrefilter = source.indexOf('scanCpltCell(line, header, "organismo_nombre", "organismo nombre")');
    const scopedFilter = source.indexOf("acceptsCpltScope(organismoNombre, scope)");
    const fullParse = source.indexOf("parseCpltColumns(line)");

    expect(yearPrefilter).toBeGreaterThan(-1);
    expect(organizationPrefilter).toBeGreaterThan(yearPrefilter);
    expect(scopedFilter).toBeGreaterThan(organizationPrefilter);
    expect(fullParse).toBe(-1);
  });

  it("decide la promoción antes de reemplazar la proyección existente", () => {
    const source = readFileSync(new URL("../stream-remote-personal.mjs", import.meta.url), "utf8");
    const promotionImport = source.indexOf('from "./source-promotion-gate.mjs"');
    const promotionCall = source.indexOf("evaluateSourcePromotion({");
    const replacement = source.indexOf("record.tipo_contrato !== tipo");

    expect(promotionImport).toBeGreaterThan(-1);
    expect(promotionCall).toBeGreaterThan(-1);
    expect(promotionCall).toBeLessThan(replacement);
  });

  it("conserva una remuneración central de planta con sus campos oficiales", () => {
    const header = parseCpltHeader("nombres;paterno;materno;anyo;mes;organismo_nombre;tipo cargo;tipo estamento;remuneracionbruta_mensual;tipo_calificacionp");
    const line = "Valentina;Latorre;Rincon;2026;Julio;Presidencia;Director/a Regional;Directivo;5676763;Profesor/a de Educación General Básica";
    const record = parseCpltRecord({
      line,
      header,
      tipo: "Planta",
      organismoId: "org-presidencia",
      sourceUrl: "https://consejotransparencia.cl/transparencia_activa/datoabierto/archivos/TA_PersonalPlanta.csv",
    });

    expect(record?.nombre_completo).toBe("Valentina Latorre Rincon");
    expect(record?.organo_nombre).toBe("Presidencia");
    expect(record?.cargo).toBe("Director/a Regional");
    expect(record?.remuneracion_bruta_mensual).toBe(5676763);
    expect(record?.fuente_periodo).toBe("2026-07");
  });
});
