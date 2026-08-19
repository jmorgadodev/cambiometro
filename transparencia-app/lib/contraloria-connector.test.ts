import { describe, expect, it } from "vitest";
import { CGR_CENTRAL_AREAS, CGR_REGIONS, normalizeCgrReport, normalizeCgrReports } from "../scripts/etl/connectors/contraloria.mjs";

const officialRow = {
  reportNumber: "198/2026",
  publishedDate: "09-07-2026",
  reportType: "Informe de Investigación Especial",
  title: "INFORME FINAL 198-2026 SERVICIO AGRÍCOLA Y GANADERO",
  level: "Central",
  area: "Agricultura",
  region: "Tarapacá",
  unit: "Regional Tarapacá",
  service: "Servicio Agrícola y Ganadero",
  sourceUrl: "https://www.contraloria.cl/SicaProd/informe/198-2026",
  conclusions: "Se constató un incumplimiento documentado por la Contraloría.",
  documentId: "documento-oficial-198",
  documentChecksumSha256: "a".repeat(64),
  documentSize: 1024,
  documentPageCount: 35,
};

describe("conector Contraloría", () => {
  it("normaliza el localizador oficial y enlaza el servicio fiscalizado", () => {
    expect(normalizeCgrReport(officialRow)).toMatchObject({
      fecha: "2026-07-09",
      kind: "audit",
      report_number: "198/2026",
      report_year: 2026,
      region: "Tarapacá",
      cgr_unit: "Regional Tarapacá",
      amount: null,
      findings: [],
      document_locator: { report_number: "198/2026", document_id: "documento-oficial-198", page: null },
      document_checksum_sha256: "a".repeat(64),
      document_page_count: 35,
      entities: expect.arrayContaining([
        expect.objectContaining({ id: "public-body-cgr", kind: "public_body" }),
        expect.objectContaining({ id: expect.stringMatching(/^public-body-cgr-service-/), name: "Servicio Agrícola y Ganadero" }),
      ]),
      subject_entity_ids: ["public-body-cgr"],
      object_entity_ids: [expect.stringMatching(/^public-body-cgr-service-/)],
      relations: [expect.objectContaining({ fromId: "public-body-cgr", predicate: "audited", method: "official_service_field" })],
      reconciliation_method: "official_report_number",
    });
  });

  it("no inventa un organismo fiscalizado cuando el informe no lo identifica", () => {
    const result = normalizeCgrReport({ ...officialRow, service: null });
    expect(result.object_entity_ids).toEqual([]);
    expect(result.relations).toEqual([]);
    expect(result.entities).toEqual([expect.objectContaining({ id: "public-body-cgr" })]);
  });

  it("sólo conserva hallazgos que tengan página verificable", () => {
    const result = normalizeCgrReport({
      ...officialRow,
      findings: [{ text: "Hallazgo sin página", page: null }, { text: "Hallazgo trazable", page: 14 }],
    });
    expect(result.findings).toEqual([{ text: "Hallazgo trazable", page: 14 }]);
    expect(result.document_locator.page).toBe(14);
  });

  it("rechaza fechas, números y duplicados incompatibles", () => {
    expect(() => normalizeCgrReport({ ...officialRow, publishedDate: "julio" })).toThrow("CGR_INVALID_DATE");
    expect(() => normalizeCgrReport({ ...officialRow, reportNumber: "198" })).toThrow("CGR_INVALID_REPORT_NUMBER");
    expect(() => normalizeCgrReports([officialRow, officialRow])).toThrow("CGR_DUPLICATE_REPORT");
    expect(CGR_CENTRAL_AREAS).toHaveLength(27);
    expect(CGR_REGIONS).toHaveLength(16);
  });
});
