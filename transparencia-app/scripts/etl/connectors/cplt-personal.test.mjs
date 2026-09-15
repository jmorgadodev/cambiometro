import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCpltHeader, parseCpltLine, parseCpltRecord, scanCpltCell } from "../cplt-personal.mjs";

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
    const yearPrefilter = source.indexOf('getCpltColumn(columns, header, "anyo", "año")');
    const organizationPrefilter = source.indexOf('getCpltColumn(columns, header, "organismo_nombre", "organismo nombre")');
    const scopedFilter = source.indexOf("acceptsCpltScope(organismoNombre, scope)");
    const fullParse = source.indexOf("parseCpltLine(line)");

    expect(yearPrefilter).toBeGreaterThan(-1);
    expect(organizationPrefilter).toBeGreaterThan(yearPrefilter);
    expect(scopedFilter).toBeGreaterThan(organizationPrefilter);
    expect(fullParse).toBeGreaterThan(-1);
  });

  it("conserva las columnas cuando una descripción contiene un punto y coma", () => {
    const header = parseCpltHeader("id;camino;organismo_nombre;anyo;mes;nombres;paterno;materno;tipo cargo;remuneracionbruta");
    const columns = parseCpltLine('1;"Personal; Contrata";Presidencia;2026;Agosto;ANA;PEREZ;SOTO;ASESORA;1000000');
    const record = parseCpltRecord({ columns, header, tipo: "Contrata", organismoId: "org-presidencia", sourceUrl: "https://oficial.test/contrata" });
    expect(record).toMatchObject({ fuente_periodo: "2026-08", organo_nombre: "Presidencia", remuneracion_bruta_mensual: 1_000_000 });
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

  it("rechaza un período posterior al corte de ejecución", () => {
    const header = parseCpltHeader("nombres;paterno;materno;anyo;mes;organismo_nombre;tipo cargo;remuneracionbruta_mensual");
    const columns = parseCpltLine("Ana;Pérez;Soto;2026;Diciembre;Presidencia;Asesora;1000000");
    expect(parseCpltRecord({
      columns,
      header,
      tipo: "Contrata",
      organismoId: "org-presidencia",
      sourceUrl: "https://oficial.test/contrata",
      maxPeriod: "2026-09",
    })).toBeNull();
  });
});
