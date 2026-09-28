import { describe, expect, it } from "vitest";
import {
  assembleCgrSegmentedCandidates,
  buildCgrReportFromSearchDetail,
  collectCgrSearchMonth,
  mergeCgrReportsByDocumentId,
  waitForCgrDocumentReady,
} from "./contraloria-search-ingest.mjs";

describe("recuperación de auditorías CGR desde el índice y detalle SICA", () => {
  it("espera a que SICA termine de inicializar el control PDF antes de descargar", async () => {
    const readiness = [];
    const page = {
      waitForLoadState: async (state, options) => readiness.push(["load", state, options]),
      locator: (selector) => ({
        first: () => ({ waitFor: async (options) => readiness.push(["control", selector, options]) }),
      }),
    };

    await waitForCgrDocumentReady(page);

    expect(readiness).toEqual([
      ["load", "networkidle", { timeout: 60_000 }],
      ["control", "#cil1", { state: "visible", timeout: 30_000 }],
    ]);
  });

  it("recorre la búsqueda mensual segmentada, valida dos pasadas y proyecta los hits oficiales", async () => {
    const hit = {
      _id: "doc-a",
      _source: {
        "número": "97/2026",
        fecha_documento: "2026-08-03T00:00:00Z",
        unidad_cgr: "Regional Bío-Bío",
        tipo: "Informe Final de Auditoria",
        servicio_: "MUNICIPALIDAD DE LEBU",
        nombre: "Informe 97",
        pdf: "https://www.contraloria.cl/SicaProd/report?docIdcm=doc-a&pdf=1",
      },
    };
    const fetchImpl = async (url) => {
      if (String(url).includes("widget.js")) return {
        ok: true,
        text: async () => `name:"Unidad",options:["Regional Bío-Bío"],field:"unidad_cgr"`,
      };
      return {
        ok: true,
        text: async () => JSON.stringify({ hits: { total: { value: 1, relation: "eq" }, hits: [hit] } }),
      };
    };

    const result = await collectCgrSearchMonth("2026-08", { fetchImpl, waitMs: 0, sleep: async () => {} });

    expect(result).toMatchObject({
      month: "2026-08",
      globalDeclaredTotal: 1,
      activeUnits: 1,
      candidates: [{ id: "doc-a", documentId: "doc-a", reportNumber: "97/2026" }],
      matchesGlobalDeclaredTotal: true,
    });
  });

  it("rechaza una respuesta declarada sobre el límite antes de leer su cuerpo", async () => {
    let bodyRead = false;
    const fetchImpl = async (url) => String(url).includes("widget.js")
      ? { ok: true, text: async () => `name:"Unidad",options:["Regional Ñuble"],field:"unidad_cgr"` }
      : {
        ok: true,
        headers: { get: (name) => name.toLowerCase() === "content-length" ? String(2 * 1024 * 1024) : null },
        text: async () => { bodyRead = true; return "{}"; },
      };

    await expect(collectCgrSearchMonth("2026-08", {
      fetchImpl,
      waitMs: 0,
      maxResponseBytes: 1024 * 1024,
    })).rejects.toThrow("CGR_SEARCH_RESPONSE_LIMIT:2097152");
    expect(bodyRead).toBe(false);
  });

  it("reintenta un fallo transitorio de red en la consulta idempotente y termina la conciliación", async () => {
    let searchCalls = 0;
    const hit = {
      _id: "doc-a",
      _source: {
        "número": "97/2026",
        fecha_documento: "2026-08-03T00:00:00Z",
        unidad_cgr: "Regional Bío-Bío",
        tipo: "Informe Final de Auditoria",
        servicio_: "MUNICIPALIDAD DE LEBU",
        nombre: "Informe 97",
        pdf: "https://www.contraloria.cl/SicaProd/report?docIdcm=doc-a&pdf=1",
      },
    };
    const fetchImpl = async (url) => {
      if (String(url).includes("widget.js")) return {
        ok: true,
        text: async () => `name:"Unidad",options:["Regional Bío-Bío"],field:"unidad_cgr"`,
      };
      searchCalls += 1;
      if (searchCalls === 1) throw new TypeError("transient socket close");
      return { ok: true, text: async () => JSON.stringify({ hits: { total: { value: 1, relation: "eq" }, hits: [hit] } }) };
    };

    const result = await collectCgrSearchMonth("2026-08", {
      fetchImpl,
      waitMs: 0,
      sleep: async () => {},
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.matchesGlobalDeclaredTotal).toBe(true);
    expect(searchCalls).toBe(4);
  });

  it("acepta la unión estable de unidades con alias si cubre el total oficial y deduplica por ID", () => {
    const report = (id) => ({ id, reportNumber: `${id}/2026`, publishedAt: "2026-08-01" });
    const passOne = [
      { unit: "Regional Ñuble", declaredTotal: 2, hits: [report("a"), report("b")] },
      { unit: "Ñuble", declaredTotal: 1, hits: [report("b")] },
    ];
    const passTwo = [
      { unit: "Regional Ñuble", declaredTotal: 2, hits: [report("a"), report("b")] },
      { unit: "Ñuble", declaredTotal: 1, hits: [report("b")] },
    ];

    expect(assembleCgrSegmentedCandidates({ globalDeclaredTotal: 2, passOne, passTwo })).toEqual({
      candidates: [report("a"), report("b")],
      activeUnits: 2,
      summedSegmentHits: 3,
      overlapIds: 1,
      matchesGlobalDeclaredTotal: true,
    });
  });

  it("rechaza segmentos inestables, incompletos o que no cubren el total del buscador", () => {
    const report = (id) => ({ id, reportNumber: `${id}/2026` });
    const stable = [{ unit: "Regional Ñuble", declaredTotal: 1, hits: [report("a")] }];

    expect(() => assembleCgrSegmentedCandidates({
      globalDeclaredTotal: 1,
      passOne: stable,
      passTwo: [{ unit: "Regional Ñuble", declaredTotal: 1, hits: [report("b")] }],
    })).toThrow("CGR_SEGMENT_SEARCH_UNSTABLE");
    expect(() => assembleCgrSegmentedCandidates({
      globalDeclaredTotal: 2,
      passOne: stable,
      passTwo: stable,
    })).toThrow("CGR_SEGMENT_SEARCH_TOTAL_MISMATCH:1!=2");
  });

  it("usa los metadatos SICA como fuente canónica cuando el índice tiene un tipo distinto", () => {
    const candidate = {
      reportNumber: "97/2026",
      publishedAt: "2026-08-03",
      reportType: "Informe Final de Auditoria",
      unit: "Regional Bío-Bío",
      service: "MUNICIPALIDAD DE LEBU",
      title: "INFORME FINAL EXAMEN DE CUENTAS 97-2026 MUNICIPALIDAD DE LEBU - SOBRE PAGO BENEFICIOS ECONÓMICOS - AGOSTO 2026",
      documentId: "official-doc-97",
    };
    const fields = {
      "Número": "97/2026",
      "Fecha": "03/08/2026",
      "Tipo de Informe": "Informe Final de Auditoría Simplificada",
      "Unidad CGR": "Regional Bío-Bío",
      "Región": "Bío-Bío",
      "Servicio": "MUNICIPALIDAD DE LEBU",
      "Nombre de Informe": candidate.title,
      "Objetivos": "Examinar los pagos informados.",
      "Universo": "Pagos seleccionados.",
      "Muestra": "Muestra documental.",
      "Conclusiones o Dictamen": "Conclusión publicada.",
    };

    expect(buildCgrReportFromSearchDetail(candidate, fields)).toEqual({
      reportNumber: "97/2026",
      publishedDate: "03/08/2026",
      reportType: "Informe Final de Auditoría Simplificada",
      title: candidate.title,
      level: "Regional",
      unit: "Regional Bío-Bío",
      area: "Regional",
      region: "Bío-Bío",
      service: "MUNICIPALIDAD DE LEBU",
      objectives: "Examinar los pagos informados.",
      universe: "Pagos seleccionados.",
      sample: "Muestra documental.",
      conclusions: "Conclusión publicada.",
      documentId: "official-doc-97",
      sourceUrl: "https://www.contraloria.cl/SicaProd/SICAv3-BIFAPortalCGR/faces/newDetalleInforme?docIdcm=official-doc-97",
      documentError: null,
    });
  });

  it("rechaza detalles cuyo número, fecha, unidad, servicio o título no identifican al candidato", () => {
    const candidate = {
      reportNumber: "97/2026",
      publishedAt: "2026-08-03",
      unit: "Regional Bío-Bío",
      service: "MUNICIPALIDAD DE LEBU",
      title: "Informe 97",
      documentId: "official-doc-97",
    };
    const fields = {
      "Número": "98/2026",
      "Fecha": "03/08/2026",
      "Tipo de Informe": "Informe Final",
      "Unidad CGR": "Regional Bío-Bío",
      "Servicio": "MUNICIPALIDAD DE LEBU",
      "Nombre de Informe": "Informe 97",
    };

    expect(() => buildCgrReportFromSearchDetail(candidate, fields)).toThrow("CGR_SEARCH_DETAIL_IDENTITY_MISMATCH:Número");
  });

  it("agrega documentos recuperados por docIdcm sin duplicar ni reescribir los listados existentes", () => {
    const listed = [
      { documentId: "existing-1", reportNumber: "12/2026", title: "Original SICA" },
    ];
    const recovered = [
      { documentId: "existing-1", reportNumber: "12/2026", title: "Índice duplicado" },
      { documentId: "missing-2", reportNumber: "13/2026", title: "Recuperado" },
    ];

    expect(mergeCgrReportsByDocumentId(listed, recovered)).toEqual([
      listed[0],
      recovered[1],
    ]);
  });

  it("falla si un mismo docIdcm se presenta con identidades documentales incompatibles", () => {
    expect(() => mergeCgrReportsByDocumentId(
      [{ documentId: "same-doc", reportNumber: "12/2026", publishedDate: "01/08/2026" }],
      [{ documentId: "same-doc", reportNumber: "99/2026", publishedDate: "01/08/2026" }],
    )).toThrow("CGR_DOCUMENT_IDENTITY_CONFLICT:same-doc");
  });
});
