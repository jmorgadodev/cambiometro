import { describe, expect, it } from "vitest";
import { buildSinimExportUrl, extractSinimPeriods, normalizeSinimSpreadsheetXml, SINIM_CORE_METRICS } from "../scripts/etl/connectors/sinim.mjs";

const xml = `<?xml version="1.0"?><Workbook><Worksheet><Table>
<Row><Cell><Data ss:Type="String">Valores en miles de pesos nominales (M$) de cada año.</Data></Cell></Row>
<Row><Cell><Data ss:Type="String"></Data></Cell><Cell><Data ss:Type="String"></Data></Cell><Cell><Data ss:Type="String">BPIIM (M$) Presupuesto Inicial Sector Municipal</Data></Cell><Cell><Data ss:Type="String">IRH17 (N°) Número de Funcionarios Municipales</Data></Cell></Row>
<Row><Cell><Data ss:Type="String">CODIGO</Data></Cell><Cell><Data ss:Type="String">MUNICIPIO</Data></Cell><Cell><Data ss:Type="String">2025</Data></Cell><Cell><Data ss:Type="String">2025</Data></Cell></Row>
<Row><Cell><Data ss:Type="Number">01101</Data></Cell><Cell><Data ss:Type="String">IQUIQUE</Data></Cell><Cell><Data ss:Type="Number">108892278</Data></Cell><Cell><Data ss:Type="Number">842</Data></Cell></Row>
<Row><Cell><Data ss:Type="Number">01107</Data></Cell><Cell><Data ss:Type="String">ALTO HOSPICIO</Data></Cell><Cell><Data ss:Type="String">S/I</Data></Cell><Cell><Data ss:Type="Number">300</Data></Cell></Row>
</Table></Worksheet></Workbook>`;

describe("conector SINIM", () => {
  it("descubre IDs de períodos sin asumir que el portal está actualizado", () => {
    const periods = extractSinimPeriods('<select id="periodos"><option value="26">Año 2025</option><option value="25">Año 2024</option></select>');
    expect(periods).toEqual([{ id: 26, year: 2025 }, { id: 25, year: 2024 }]);
  });

  it("construye el export oficial para todas las municipalidades y sin corrección monetaria", () => {
    const url = new URL(buildSinimExportUrl(26, [SINIM_CORE_METRICS[0], SINIM_CORE_METRICS.at(-1)!]));
    expect(url.searchParams.get("periodos[]")).toBe("26");
    expect(url.searchParams.get("municipios[]")).toBe("T");
    expect(url.searchParams.get("variables[]")).toBe("4210,4071");
    expect(url.searchParams.get("corrmon")).toBe("0");
  });

  it("normaliza M$ a CLP, conserva unidad y crea entidades por código territorial", () => {
    const metrics = [SINIM_CORE_METRICS.find((item) => item.id === 4210)!, SINIM_CORE_METRICS.find((item) => item.id === 4071)!];
    const result = normalizeSinimSpreadsheetXml(xml, { year: 2025, metrics, sourceUrl: "https://datos.sinim.gov.cl/oficial.xls" });
    expect(result.municipalityCount).toBe(2);
    expect(result.missingValueCount).toBe(1);
    expect(result.records).toHaveLength(4);
    expect(result.records[0]).toMatchObject({ municipality_code: "01101", municipality_name: "IQUIQUE", monto_clp: 108_892_278_000, monto_original: { amount: "108892278", currency: "CLP", unit: "miles de pesos" }, subject_entity_ids: ["municipality-cl-01101"] });
    expect(result.records.find((item) => item.metric_code === "IRH17")).toMatchObject({ value: 842, monto_clp: null, original_unit: "número entero" });
    expect(result.records.find((item) => item.municipality_code === "01107" && item.metric_code === "BPIIM")).toMatchObject({ value: null, availability: "not_received", monto_clp: null });
  });

  it("rechaza una planilla cuyo encabezado ya no coincide con las métricas solicitadas", () => {
    const metric = SINIM_CORE_METRICS.find((item) => item.id === 1110)!;
    expect(() => normalizeSinimSpreadsheetXml(xml, { year: 2025, metrics: [metric], sourceUrl: "https://datos.sinim.gov.cl/oficial.xls" })).toThrow("SINIM_METRIC_HEADER_MISMATCH");
  });
});
