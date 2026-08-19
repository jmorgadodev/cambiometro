import { describe, expect, it } from "vitest";
import { normalizeCgrConsolidatedProduct, normalizeCgrConsolidatedProducts } from "../scripts/etl/connectors/contraloria.mjs";

const officialProduct = {
  officialId: "40", number: "CIC23/2026", publishedAt: "2026-06-15T00:00:00+00:00",
  productType: "Consolidado de Información Circularizada",
  title: "PERMISOS DE CIRCULACIÓN RENOVADOS CON VULNERACIÓN A LA NORMATIVA",
  summary: "El presente CIC identifica los resultados del cruce oficial.",
  unit: "División de Gobiernos Regionales y Municipalidades",
  sector: "Municipalidades y Corporaciones Municipales R.M.",
  sourceUrl: "https://www.contraloria.cl/SicaProd/SICAv3-BIFAPortalCGR/servletfichacic?id=40&t=w",
  printableDocumentUrl: "https://www.contraloria.cl/SicaProd/SICAv3-BIFAPortalCGR/servletfichacic?id=40&t=p",
  findings: [{ text: "El presente CIC identifica los resultados del cruce oficial.", page: 1, locator_method: "exact_text" }],
  documentChecksumSha256: "a".repeat(64), documentSize: 1234, documentPageCount: 1,
};

describe("conector oficial CIC/CRA/RADAR de Contraloría", () => {
  it("normaliza un CIC con identidad oficial y evidencia localizada", () => {
    expect(normalizeCgrConsolidatedProduct(officialProduct)).toMatchObject({
      id: "cgr-cic-2026-23", fecha: "2026-06-15", kind: "audit", cgr_product_type: "cic",
      report_number: "CIC23/2026", amount: null, subject_entity_ids: ["public-body-cgr"], object_entity_ids: [],
      document_locator: { document_id: "40", page: 1 },
    });
  });

  it("diferencia CRA y RADAR sin convertirlos en CIC", () => {
    expect(normalizeCgrConsolidatedProduct({ ...officialProduct, officialId: "28", number: "CRA2/2025", publishedAt: "2025-12-22", productType: "Consolidado de Resultados de Auditoría" }).cgr_product_type).toBe("cra");
    expect(normalizeCgrConsolidatedProduct({ ...officialProduct, officialId: "41", number: "RADAR2/2026", productType: "Reporte de análisis de datos de alerta de riesgo" }).cgr_product_type).toBe("radar");
  });

  it("rechaza tipos, URLs e identidades inconsistentes", () => {
    expect(() => normalizeCgrConsolidatedProduct({ ...officialProduct, productType: "Consolidado de Resultados de Auditoría" })).toThrow("CGR_CONSOLIDATED_TYPE_MISMATCH");
    expect(() => normalizeCgrConsolidatedProduct({ ...officialProduct, sourceUrl: "https://example.com/doc.pdf" })).toThrow("CGR_INVALID_CONSOLIDATED_URL");
    expect(() => normalizeCgrConsolidatedProducts([officialProduct, officialProduct])).toThrow("CGR_DUPLICATE_CONSOLIDATED_PRODUCT");
  });
});
