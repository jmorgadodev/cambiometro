import { describe, expect, it, vi } from "vitest";
import {
  buildChileCompraListUrl,
  filterChileCompraRecordsByCutoff,
  fetchChileCompraMonth,
  normalizeOcdsPackage,
  reconcileChileCompraRecords,
} from "../scripts/etl/connectors/chilecompra.mjs";

const awardPackage = {
  uri: "https://api.mercadopublico.cl/APISOCDS/OCDS/award/1-2-TD26",
  publishedDate: "2026-06-02T10:00:00Z",
  license: "https://creativecommons.org/publicdomain/zero/1.0/",
  releases: [{
    ocid: "ocds-70d2nz-1-2-TD26",
    id: "release-1",
    date: "2026-06-01T10:00:00Z",
    parties: [
      { id: "CL-MP-10", name: "ORGANISMO | UNIDAD", identifier: { scheme: "CL-RUT", id: "609100001" }, address: { streetAddress: "Dirección interna" }, contactPoint: { name: "Contacto" }, roles: ["buyer"] },
      { id: "CL-MP-20", name: "PERSONA PROVEEDORA", identifier: { scheme: "CL-RUT", id: "123456789", legalName: "PERSONA PROVEEDORA" }, address: { streetAddress: "Domicilio particular" }, roles: ["supplier"] },
    ],
    buyer: { id: "CL-MP-10", name: "ORGANISMO | UNIDAD" },
    tender: { id: "1-2-TD26", procurementMethod: "direct", procurementMethodRationale: "Especialidad" },
    awards: [{
      id: "99",
      title: "Servicio profesional",
      status: "active",
      date: "2026-06-01T10:00:00Z",
      value: { amount: 593301, currency: "CLP" },
      suppliers: [{ id: "CL-MP-20", name: "PERSONA PROVEEDORA" }],
      items: [{ id: "item-1", description: "Servicio", quantity: 1, unit: { name: "unidad", value: { amount: 593301, currency: "CLP" } }, classification: { id: "80111715", scheme: "UNSPSC" } }],
      documents: [{ id: "1", url: "https://www.mercadopublico.cl/orden/1", documentType: "awardNotice", title: "Orden" }],
    }],
  }],
};

describe("conector ChileCompra OCDS", () => {
  it("construye los tres listados mensuales oficiales", () => {
    expect(buildChileCompraListUrl("licitacion", 2026, 6, 0, 1000)).toContain("/listaOCDSAgnoMes/2026/06/0/1000");
    expect(buildChileCompraListUrl("trato_directo", 2026, 6, 1000, 1000)).toContain("/listaOCDSAgnoMesTratoDirecto/2026/06/1000/1000");
    expect(buildChileCompraListUrl("convenio_marco", 2026, 6, 0, 25)).toContain("/listaOCDSAgnoMesConvenio/2026/06/0/25");
  });

  it("normaliza adjudicación, IDs oficiales, monto CLP e ítems sin exponer RUT ni domicilios personales", () => {
    const records = normalizeOcdsPackage(awardPackage, { procurementType: "trato_directo", sourceUrl: awardPackage.uri });
    expect(records).toHaveLength(2);
    const record = records.find((item) => item.stage === "award");
    expect(record).toMatchObject({
      id: "ocds-70d2nz-1-2-TD26-award-99",
      kind: "contract",
      fecha: "2026-06-01T10:00:00Z",
      monto_clp: 593301,
      monto_original: { amount: "593301", currency: "CLP", unit: "currency_unit" },
      buyer: { id: "CL-MP-10", rut_juridico: "60.910.000-1" },
      suppliers: [{ id: "CL-MP-20", name: "PERSONA PROVEEDORA" }],
    });
    const serialized = JSON.stringify(record);
    expect(serialized).not.toContain("123456789");
    expect(serialized).not.toContain("Domicilio particular");
    expect(serialized).not.toContain("Contacto");
    expect(record?.items[0]).toMatchObject({ classification: { id: "80111715", scheme: "UNSPSC" } });
  });

  it("conserva moneda extranjera sin fabricar un monto CLP", () => {
    const fixture = structuredClone(awardPackage);
    fixture.releases[0].awards[0].value = { amount: 691.03, currency: "USD" };
    const record = normalizeOcdsPackage(fixture, { procurementType: "convenio_marco", sourceUrl: fixture.uri }).find((item) => item.stage === "award")!;
    expect(record.monto_clp).toBeNull();
    expect(record.monto_original).toEqual({ amount: "691.03", currency: "USD", unit: "currency_unit" });
  });

  it("publica RUT del proveedor sólo cuando la fuente identifica una persona jurídica", () => {
    const fixture = structuredClone(awardPackage);
    fixture.releases[0].parties[1] = {
      id: "CL-MP-20", name: "CASCO ANTIGUO CHILE SPA",
      identifier: { scheme: "CL-RUT", id: "760447536", legalName: "CASCO ANTIGUO CHILE SPA" },
      address: { streetAddress: "Dirección comercial" }, roles: ["supplier"],
    };
    fixture.releases[0].awards[0].suppliers = [{ id: "CL-MP-20", name: "CASCO ANTIGUO CHILE SPA" }];

    const record = normalizeOcdsPackage(fixture, { procurementType: "licitacion", sourceUrl: fixture.uri }).find((item) => item.stage === "award")!;

    expect(record.suppliers[0]).toMatchObject({ id: "CL-MP-20", legal_name: "CASCO ANTIGUO CHILE SPA", rut_juridico: "76.044.753-6" });
    expect(JSON.stringify(record)).not.toContain("Dirección comercial");
  });

  it("enlaza el contrato con los proveedores de su adjudicación oficial", () => {
    const base = structuredClone(awardPackage);
    const release = base.releases[0];
    const fixture = {
      ...base,
      releases: [{
        ...release,
        parties: release.parties.map((party) => party.id === "CL-MP-20" ? {
          ...party,
          name: "CASCO ANTIGUO CHILE SPA",
          identifier: { ...party.identifier, id: "760447536", legalName: "CASCO ANTIGUO CHILE SPA" },
        } : party),
        awards: release.awards.map((award) => ({ ...award, suppliers: [{ id: "CL-MP-20", name: "CASCO ANTIGUO CHILE SPA" }] })),
        contracts: [{ id: "contract-99", awardID: "99", title: "Contrato adjudicado", status: "active", dateSigned: "2026-06-03T00:00:00Z" }],
      }],
    };

    const contract = normalizeOcdsPackage(fixture, { procurementType: "licitacion", sourceUrl: fixture.uri }).find((item) => item.stage === "contract")!;

    expect(contract.suppliers).toEqual([expect.objectContaining({ id: "CL-MP-20", rut_juridico: "76.044.753-6" })]);
  });

  it("conserva colisiones OCDS de compradores distintos con IDs estables y sin exponer el identificador", () => {
    const first = normalizeOcdsPackage(awardPackage, { procurementType: "trato_directo", sourceUrl: "https://api.mercadopublico.cl/a/1" });
    const secondPackage = structuredClone(awardPackage);
    secondPackage.releases[0].buyer = { id: "CL-MP-OTRO", name: "OTRO ORGANISMO" };
    secondPackage.releases[0].parties[0] = { ...secondPackage.releases[0].parties[0], id: "CL-MP-OTRO", name: "OTRO ORGANISMO" };
    secondPackage.releases[0].date = "2026-06-03T10:00:00Z";
    const second = normalizeOcdsPackage(secondPackage, { procurementType: "trato_directo", sourceUrl: "https://api.mercadopublico.cl/a/2" });

    const records = reconcileChileCompraRecords([...second, ...first]);
    const repeated = reconcileChileCompraRecords([...first, ...second]);

    expect(new Set(records.map((record) => record.id)).size).toBe(records.length);
    expect(records.map((record) => record.id)).toEqual(repeated.map((record) => record.id));
    expect(records.filter((record) => record.stage === "tender")).toHaveLength(2);
    expect(records.every((record) => record.id.includes("CL-MP-") === false)).toBe(true);
    expect(records.every((record) => record.source_id_collision === true)).toBe(true);
  });

  it("conserva sólo la actualización más reciente del mismo comprador e ID oficial", () => {
    const older = normalizeOcdsPackage(awardPackage, { procurementType: "trato_directo", sourceUrl: "https://api.mercadopublico.cl/a/older" });
    const newerPackage = structuredClone(awardPackage);
    newerPackage.releases[0].date = "2026-06-04T10:00:00Z";
    Object.assign(newerPackage.releases[0].tender, { title: "Versión vigente" });
    const newer = normalizeOcdsPackage(newerPackage, { procurementType: "trato_directo", sourceUrl: "https://api.mercadopublico.cl/a/newer" });

    const records = reconcileChileCompraRecords([...older, ...newer]);

    expect(records).toHaveLength(2);
    expect(records.find((record) => record.stage === "tender")?.title).toBe("Versión vigente");
    expect(records.every((record) => record.source_id_collision === undefined)).toBe(true);
  });

  it("pagina hasta el total oficial y descarga cada documento sin un límite global", async () => {
    const listCalls: string[] = [];
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("listaOCDSAgnoMesTratoDirecto")) {
        listCalls.push(url);
        const offset = Number(url.split("/").at(-2));
        const data = offset === 0
          ? [{ ocid: "one", urlAward: "http://api.mercadopublico.cl/a/1" }, { ocid: "two", urlAward: "http://api.mercadopublico.cl/a/2" }]
          : [{ ocid: "three", urlAward: "http://api.mercadopublico.cl/a/3" }];
        return new Response(JSON.stringify({ pagination: { offset, limit: 2, total: 3 }, data }), { status: 200 });
      }
      return new Response(JSON.stringify(awardPackage), { status: 200 });
    });
    const result = await fetchChileCompraMonth({ year: 2026, month: 6, types: ["trato_directo"], pageSize: 2, concurrency: 2, fetchImpl });
    expect(listCalls).toHaveLength(2);
    expect(result.documents).toHaveLength(3);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
  });

  it("usa el paquete masivo oficial para licitaciones sin pedir tender y award por separado", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("listaOCDSAgnoMes/")) {
        return new Response(JSON.stringify({ pagination: { offset: 0, limit: 1, total: 1 }, data: [{
          ocid: "ocds-70d2nz-123-1-LE26",
          urlTender: "https://api.mercadopublico.cl/APISOCDS/OCDS/tender/123-1-LE26",
          urlAward: "https://api.mercadopublico.cl/APISOCDS/OCDS/award/123-1-LE26",
        }] }), { status: 200 });
      }
      throw new Error(`no debe pedir documento individual: ${url}`);
    });
    const bulkLicitacionDocuments = new Map([["123-1-LE26", {
      url: "https://ocds-lic-files.da.mercadopublico.cl/2026/202606.7z#123-1-LE26.json",
      payload: awardPackage,
    }]]);
    const result = await fetchChileCompraMonth({ year: 2026, month: 6, types: ["licitacion"], fetchImpl, bulkLicitacionDocuments, requestsPerSecond: 100, retryBaseMs: 1 });
    expect(result.documents).toHaveLength(1);
    expect(result.records.length).toBeGreaterThan(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("completa por ítem las licitaciones ausentes del paquete masivo", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("listaOCDSAgnoMes/")) {
        return new Response(JSON.stringify({ pagination: { offset: 0, limit: 2, total: 2 }, data: [
          { ocid: "bulk", urlTender: "https://api.mercadopublico.cl/tender/bulk", urlAward: "https://api.mercadopublico.cl/award/bulk" },
          { ocid: "missing", urlTender: "https://api.mercadopublico.cl/tender/missing", urlAward: "https://api.mercadopublico.cl/award/missing" },
        ] }), { status: 200 });
      }
      return new Response(JSON.stringify(awardPackage), { status: 200 });
    });
    const bulkLicitacionDocuments = new Map([["bulk", { url: "https://ocds-lic-files.da.mercadopublico.cl/2026/202606.7z#bulk.json", payload: awardPackage }]]);
    const result = await fetchChileCompraMonth({ year: 2026, month: 6, types: ["licitacion"], fetchImpl, bulkLicitacionDocuments, requestsPerSecond: 100 });
    expect(result.documents).toHaveLength(3);
    expect(result.bulkCoverage).toEqual({ used: 1, missing: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("rechaza cambios incompatibles en el esquema oficial", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ pagination: { total: 1 }, records: [] }), { status: 200 }));
    await expect(fetchChileCompraMonth({ year: 2026, month: 6, types: ["licitacion"], fetchImpl })).rejects.toThrow("CHILECOMPRA_INVALID_LIST_SCHEMA");
  });

  it("acepta respuesta vacia oficial 404 sin resultados de MercadoPublico", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ status: 404, detail: "No se encontraron resultados." }), { status: 200 }));
    const result = await fetchChileCompraMonth({ year: 2026, month: 8, types: ["licitacion"], fetchImpl });
    expect(result.records).toHaveLength(0);
    expect(result.documents).toHaveLength(0);
  });

  it("aísla y reporta un documento oficial inválido sin vaciar el período", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("listaOCDSAgnoMesTratoDirecto")) {
        return new Response(JSON.stringify({ pagination: { offset: 0, limit: 2, total: 2 }, data: [
          { ocid: "valid", urlAward: "https://api.mercadopublico.cl/a/valid" },
          { ocid: "invalid", urlAward: "https://api.mercadopublico.cl/a/invalid" },
        ] }), { status: 200 });
      }
      return new Response(JSON.stringify(url.endsWith("/invalid") ? { message: "sin datos" } : awardPackage), { status: 200 });
    });

    const result = await fetchChileCompraMonth({ year: 2026, month: 6, types: ["trato_directo"], fetchImpl, requestsPerSecond: 100 });

    expect(result.records.length).toBeGreaterThan(0);
    expect(result.documents).toHaveLength(2);
    expect(result.rejectedDocuments).toEqual([expect.objectContaining({ ocid: "invalid", reason: "CHILECOMPRA_INVALID_PACKAGE_SCHEMA" })]);
  });

  it("reanuda después de un 429 sin publicar una respuesta incompleta", async () => {
    let throttled = false;
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("listaOCDSAgnoMesTratoDirecto")) {
        return new Response(JSON.stringify({ pagination: { offset: 0, limit: 1, total: 1 }, data: [{ ocid: "one", urlAward: "https://api.mercadopublico.cl/a/1" }] }), { status: 200 });
      }
      if (!throttled) { throttled = true; return new Response("", { status: 429 }); }
      return new Response(JSON.stringify(awardPackage), { status: 200 });
    });
    const result = await fetchChileCompraMonth({ year: 2026, month: 6, types: ["trato_directo"], fetchImpl, requestsPerSecond: 100, retryBaseMs: 1 });
    expect(result.documents).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("lee checkpoints antes de consumir una ranura de red", async () => {
    const fetchImpl = vi.fn(async () => { throw new Error("no debe usar red"); }) as typeof fetch & { peekJson?: (url: string) => unknown };
    fetchImpl.peekJson = (url) => url.includes("listaOCDSAgnoMesTratoDirecto")
      ? { pagination: { offset: 0, limit: 1, total: 1 }, data: [{ ocid: "one", urlAward: "https://api.mercadopublico.cl/a/1" }] }
      : awardPackage;
    const result = await fetchChileCompraMonth({ year: 2026, month: 6, types: ["trato_directo"], fetchImpl, requestsPerSecond: 1 });
    expect(result.documents).toHaveLength(1);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("excluye de la proyección registros posteriores al corte sin reemplazarlos", () => {
    expect(filterChileCompraRecordsByCutoff([
      { id: "before", data: { fecha: "2026-08-20T23:59:59Z" } },
      { id: "after", data: { fecha: "2026-08-21T00:00:00Z" } },
      { id: "unknown", data: { fecha: null } },
    ], "2026-08-20")).toEqual([
      { id: "before", data: { fecha: "2026-08-20T23:59:59Z" } },
    ]);
  });
});
