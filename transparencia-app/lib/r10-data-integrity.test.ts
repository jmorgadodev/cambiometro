import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  findBuyerByVerifiedRut,
  projectOfficialBuyer,
} from "../scripts/etl/r10-chilecompra.mjs";

const buyer = {
  id: "public-body-chilecompra-rut-609100001",
  name: "ORGANISMO OFICIAL",
  rut_juridico: "60.910.000-1",
  monto_total_clp: 12_345_678,
  procesos: 2,
  months: [{ period: "2026-07", monto_total_clp: 12_345_678, procesos: 2 }],
  top: [
    {
      title: "Adjudicación oficial",
      proveedor: "PROVEEDOR OFICIAL SPA",
      proveedor_id: "provider-1",
      monto_clp: 12_345_678,
      fecha: "2026-07-01",
      url: "https://api.mercadopublico.cl/APISOCDS/OCDS/award/1",
      ocid: "ocds-70d2nz-1",
    },
  ],
};

describe("R10 — ninguna compra inventada entra a proyecciones", () => {
  it("une compradores únicamente por RUT jurídico válido y exacto", () => {
    expect(findBuyerByVerifiedRut([buyer], "60.910.000-1")).toBe(buyer);
    expect(findBuyerByVerifiedRut([buyer], "609100001")).toBe(buyer);
    expect(findBuyerByVerifiedRut([buyer], "60.910.000-2")).toBeNull();
    expect(findBuyerByVerifiedRut([buyer], null)).toBeNull();
  });

  it("proyecta sólo valores y adjudicaciones presentes en ChileCompra", () => {
    const projection = projectOfficialBuyer(buyer);
    expect(projection).not.toBeNull();
    if (!projection) throw new Error("R10_PROJECTION_MISSING");
    expect(projection).toMatchObject({
      rut_comprador: "60.910.000-1",
      monto_total_clp: 12_345_678,
      procesos_count: 2,
      ordenes_count: null,
      metodo_enlace: "RUT_EXACTO",
    });
    expect(projection.top_compras).toEqual([
      expect.objectContaining({
        titulo: "Adjudicación oficial",
        proveedor: "PROVEEDOR OFICIAL SPA",
        monto_clp: 12_345_678,
        ocid: "ocds-70d2nz-1",
      }),
    ]);
    expect(projection.procesos).toEqual([]);
  });

  it("la ausencia de RUT o comprador oficial se representa como null", () => {
    expect(projectOfficialBuyer(null)).toBeNull();
    expect(projectOfficialBuyer({ ...buyer, rut_juridico: null })).toBeNull();
  });

  it("elimina generadores sintéticos de montos, órdenes y proveedores", () => {
    const sources = [
      "scripts/etl/generate-organismos-projection.ts",
      "scripts/rebuild-authoritative-municipalidades.mjs",
      "lib/servicios-publicos-data.ts",
      "lib/data-platform-v1.ts",
    ].map((file) => readFileSync(resolve(file), "utf8")).join("\n");

    expect(sources).not.toMatch(/presVigente\s*\*\s*0\.34/);
    expect(sources).not.toMatch(/dotacion(?:Real)?\s*\*\s*32_000_000/);
    expect(sources).not.toContain("Entel Chile S.A.");
    expect(sources).not.toContain("Sonda S.A.");
    expect(sources).not.toContain("Consorcio Ambiental de Chile SpA");
    expect(sources).not.toContain("Carlos González Asesorías e Insumos E.I.R.L.");
    expect(sources).not.toContain("Proveedor Adjudicado");
    expect(sources).not.toContain("1440000000");
    expect(sources).not.toContain("-OC${c + 1}");
  });

  it("representa como null cualquier dimensión municipal sin fuente oficial", () => {
    const source = readFileSync(resolve("scripts/rebuild-authoritative-municipalidades.mjs"), "utf8");
    expect(source).toContain("let alcalde = null");
    expect(source).not.toContain("ALCALDES_CORREGIDOS[muni.id]");
    expect(source).not.toMatch(/const estimado =/);
    expect(source).not.toMatch(/poblacion_censo_2024 \* 580000/);
    expect(source).not.toMatch(/totalFunc \* 1650000/);
    expect(source).not.toMatch(/poblacion_censo_2024 \* 0\.815/);
    expect(source).not.toMatch(/Math\.round\(bruto \* 0\.78\)/);
    expect(source).toContain("redes_sociales: null");
    expect(source).toContain("padron_electoral_servel: null");
  });
});
