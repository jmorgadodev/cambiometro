import { describe, expect, it } from "vitest";

import { buildBulkLicitacionUrl, recordPackageFromBulk } from "../scripts/etl/chilecompra-bulk.mjs";

describe("paquete masivo oficial de licitaciones OCDS", () => {
  it("construye únicamente la URL mensual oficial", () => {
    expect(buildBulkLicitacionUrl(2026, 1)).toBe("https://ocds-lic-files.da.mercadopublico.cl/2026/202601.7z");
    expect(() => buildBulkLicitacionUrl(2026, 13)).toThrow("CHILECOMPRA_BULK_INVALID_PERIOD");
  });

  it("convierte Record Package a Release Package consumible sin inventar campos", () => {
    const compiledRelease = { ocid: "ocds-70d2nz-123", id: "123", date: "2026-01-02", parties: [], awards: [] };
    expect(recordPackageFromBulk({
      uri: "https://api.mercadopublico.cl/APISOCDS/OCDS/record/123-1-LE26",
      publishedDate: "2026-01-03",
      records: [{ ocid: compiledRelease.ocid, compiledRelease }],
    })).toEqual({
      uri: "https://api.mercadopublico.cl/APISOCDS/OCDS/record/123-1-LE26",
      publishedDate: "2026-01-03",
      releases: [compiledRelease],
    });
  });

  it("trata un Record Package oficial vacío como ausencia, sin invalidar el lote mensual", () => {
    expect(recordPackageFromBulk({ records: [] })).toBeNull();
    expect(recordPackageFromBulk({ status: 404, detail: "No encontrado" })).toBeNull();
  });
});
