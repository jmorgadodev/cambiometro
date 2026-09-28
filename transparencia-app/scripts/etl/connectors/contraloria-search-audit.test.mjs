import { describe, expect, it } from "vitest";
import {
  buildCgrSearchBody,
  buildCgrDetailUrl,
  cgrReconciliationKey,
  collectCgrUnitOptions,
  compareCgrSearchAndDetail,
  compareCgrSegmentRuns,
  projectCgrAuditHit,
  summarizeCgrSegments,
} from "./contraloria-search-audit.mjs";

describe("preflight de búsqueda oficial CGR por unidad", () => {
  it("lee las opciones de unidad del widget oficial y conserva nombres con apóstrofo y tildes", () => {
    const widget = `name:"Unidad",options:["Regional Ñuble","Regional Lib. Bernardo O'Higgins","Municipalidades"],field:"unidad_cgr"`;

    expect(collectCgrUnitOptions(widget)).toEqual([
      "Regional Ñuble",
      "Regional Lib. Bernardo O'Higgins",
      "Municipalidades",
    ]);
  });

  it("construye una consulta mensual con filtros oficiales de fecha y unidad", () => {
    expect(buildCgrSearchBody({ month: "2026-07", unit: "Regional Ñuble", page: 1 })).toEqual({
      search: "",
      exact_search: false,
      options: [
        { type: "date", field: "fecha_documento", value: { gt: "2026-07-01", lt: "2026-07-31" }, dir: "gt" },
        { type: "category", field: "unidad_cgr", value: "Regional Ñuble" },
      ],
      order: null,
      date_name: "fecha_documento",
      source: "auditoria",
      page: 1,
    });
  });

  it("proyecta sólo metadatos y extrae el localizador documental oficial", () => {
    expect(projectCgrAuditHit({
      _id: "official-1",
      _source: {
        "número": "851/2024",
        fecha_documento: "2026-07-30T00:00:00+00:00",
        unidad_cgr: "Regional Ñuble",
        tipo: "Informe/Oficio de Seguimiento",
        servicio_: "MUNICIPALIDAD DE PEMUCO",
        nombre: "Seguimiento de auditoría",
        pdf: "https://www.contraloria.cl/SicaProd/report?docIdcm=official-doc&pdf=1",
        contenido_pdf: "no debe exponerse ni copiarse",
      },
    })).toEqual({
      id: "official-1",
      reportNumber: "851/2024",
      publishedAt: "2026-07-30",
      unit: "Regional Ñuble",
      reportType: "Informe/Oficio de Seguimiento",
      service: "MUNICIPALIDAD DE PEMUCO",
      title: "Seguimiento de auditoría",
      documentId: "official-doc",
      documentUrl: "https://www.contraloria.cl/SicaProd/report?docIdcm=official-doc&pdf=1",
    });
  });

  it("construye una URL SICA textual con el identificador oficial", () => {
    expect(buildCgrDetailUrl("official-doc")).toBe("https://www.contraloria.cl/SicaProd/SICAv3-BIFAPortalCGR/faces/newDetalleInforme?docIdcm=official-doc");
    expect(() => buildCgrDetailUrl("")).toThrow("CGR_MISSING_OFFICIAL_DOCUMENT_ID");
  });

  it("reconcilia metadatos del índice con la ficha SICA por número, fecha, tipo, unidad, servicio y título", () => {
    const candidate = {
      reportNumber: "655/2024",
      publishedAt: "2026-07-24",
      reportType: "Informe/Oficio de Seguimiento",
      unit: "Regional Tarapacá",
      service: "CORPORACION MUNICIPAL DE DEPORTES DE IQUIQUE",
      title: "OF140879-2026 SEGUIMIENTO AL INFORME FINAL N° 655",
    };
    const fields = {
      Número: "655/2024",
      Fecha: "24/07/2026",
      "Tipo de Informe": "Informe/Oficio de Seguimiento",
      "Unidad CGR": "Regional Tarapacá",
      Servicio: "CORPORACION MUNICIPAL DE DEPORTES DE IQUIQUE",
      "Nombre de Informe": "OF140879-2026 SEGUIMIENTO AL INFORME FINAL N° 655",
    };

    expect(compareCgrSearchAndDetail(candidate, fields)).toEqual({ matched: true, mismatches: [] });
  });

  it("no valida un detalle SICA cuando cambia la fecha o falta un campo oficial", () => {
    const candidate = { reportNumber: "655/2024", publishedAt: "2026-07-24", title: "Seguimiento" };
    const fields = { Número: "655/2024", Fecha: "25/07/2026", "Nombre de Informe": "Seguimiento" };

    expect(compareCgrSearchAndDetail(candidate, fields)).toEqual({
      matched: false,
      mismatches: ["Fecha", "Tipo de Informe", "Unidad CGR", "Servicio"],
    });
  });

  it("concilia la búsqueda oficial con R2 sólo por número, fecha y servicio normalizados", () => {
    const official = { reportNumber: "655/2024", publishedAt: "2026-07-24", service: "Corporación Municipal de Deportes de Iquique" };
    const published = { data: { data: { report_number: "655 / 2024", service: "CORPORACION MUNICIPAL DE DEPORTES DE IQUIQUE" } }, occurredAt: "2026-07-24" };
    const differentService = { data: { data: { report_number: "655/2024", service: "MUNICIPALIDAD DE IQUIQUE" } }, occurredAt: "2026-07-24" };

    expect(cgrReconciliationKey(official)).toBe(cgrReconciliationKey(published));
    expect(cgrReconciliationKey(official)).not.toBe(cgrReconciliationKey(differentService));
  });

  it("deduplica sólo por ID oficial y expone alias solapados entre unidades", () => {
    const summary = summarizeCgrSegments([
      { unit: "Regional Ñuble", pass: 1, declaredTotal: 2, hits: [{ id: "a", unit: "Ñuble" }, { id: "b", unit: "Regional Ñuble" }] },
      { unit: "Ñuble", pass: 1, declaredTotal: 1, hits: [{ id: "b", unit: "Regional Ñuble" }] },
    ]);

    expect(summary).toMatchObject({
      uniqueIds: 2,
      summedSegmentHits: 3,
      overlapIds: 1,
      complete: true,
    });
  });

  it("marca inestabilidad entre repeticiones y segmentos incompletos", () => {
    const comparison = compareCgrSegmentRuns([
      { unit: "Regional Ñuble", pass: 1, declaredTotal: 2, hits: [{ id: "a" }, { id: "b" }] },
      { unit: "Regional Ñuble", pass: 2, declaredTotal: 2, hits: [{ id: "a" }, { id: "c" }] },
      { unit: "Municipalidades", pass: 1, declaredTotal: 2, hits: [{ id: "m1" }] },
    ]);

    expect(comparison.stable).toBe(false);
    expect(comparison.unstableUnits).toEqual(["Municipalidades", "Regional Ñuble"]);
    expect(comparison.incompleteUnits).toEqual(["Municipalidades"]);
  });
});
