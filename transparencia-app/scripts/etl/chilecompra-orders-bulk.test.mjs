import test from "node:test";
import assert from "node:assert/strict";

import {
  canonicalRecordsForOfficialOrder,
  hasExactOfficialOrderSchema,
  mergeOfficialOrderRow,
  officialOrderFromRow,
  shouldPublishOfficialMonth,
} from "./chilecompra-orders-bulk.mjs";

const BASE = {
  codigoOC: "3682-1395-SE26",
  FechaEnvioOC: "2026-07-15",
  NombreOC: "INSUMOS VARIOS",
  DescripcionOC: "Compra oficial",
  EstadoOC: "Aceptada",
  ProcedenciaOC: "Trato Directo",
  MonedaOC: "CLP",
  MontoTotalOC: "451199.9998",
  UnidadCompra: "I MUNICIPALIDAD DE SALAMANCA",
  UnidadCompraRUT: "69.041.400-7",
  entCode: "116295",
  Institucion: "I MUNICIPALIDAD DE SALAMANCA",
  Proveedor: "PROVEEDOR OFICIAL SPA",
  ProveedorRUT: "76.123.456-0",
};

test("R10 normaliza una orden oficial CLP sin inventar campos", () => {
  assert.deepEqual(officialOrderFromRow(BASE, { sourceUrl: "https://official.example/archive.7z" }), {
    code: "3682-1395-SE26",
    date: "2026-07-15",
    period: "2026-07",
    title: "INSUMOS VARIOS",
    description: "Compra oficial",
    status: "Aceptada",
    procurementType: "trato_directo",
    amountClp: 451200,
    buyer: {
      id: "CL-MP-116295",
      name: "I MUNICIPALIDAD DE SALAMANCA",
      legal_name: "I MUNICIPALIDAD DE SALAMANCA",
      rut_juridico: "69.041.400-7",
    },
    supplier: {
      id: "legal-cl-761234560",
      name: "PROVEEDOR OFICIAL SPA",
      legal_name: "PROVEEDOR OFICIAL SPA",
      rut_juridico: "76.123.456-0",
    },
    sourceUrl: "https://official.example/archive.7z",
  });
});

test("R10 conserva ausencia y moneda no CLP como null", () => {
  const result = officialOrderFromRow({
    ...BASE,
    MonedaOC: "USD",
    MontoTotalOC: "1000",
    Proveedor: "",
    ProveedorRUT: "",
  }, { sourceUrl: "https://official.example/archive.7z" });
  assert.equal(result.amountClp, null);
  assert.equal(result.supplier, null);
});

test("deduplicación por codigoOC no suma una orden repetida por ítem", () => {
  const orders = new Map();
  mergeOfficialOrderRow(orders, BASE, { sourceUrl: "https://official.example/archive.7z" });
  mergeOfficialOrderRow(orders, { ...BASE, NombreItem: "SEGUNDO ITEM" }, { sourceUrl: "https://official.example/archive.7z" });
  assert.equal(orders.size, 1);
  assert.equal(orders.get(BASE.codigoOC).amountClp, 451200);
});

test("solo estados oficiales publicables producen registros canónicos", () => {
  const accepted = officialOrderFromRow(BASE, { sourceUrl: "https://official.example/archive.7z" });
  const records = canonicalRecordsForOfficialOrder(accepted);
  assert.equal(records.length, 2);
  assert.equal(records[0].kind, "purchase");
  assert.equal(records[1].kind, "contract");
  assert.equal(records[1].data.monto_clp, 451200);
  assert.equal(records[1].data.suppliers[0].rut_juridico, "76.123.456-0");

  assert.equal(officialOrderFromRow({ ...BASE, EstadoOC: "Cancelada" }, {
    sourceUrl: "https://official.example/archive.7z",
  }), null);
});

test("filtra por año, meses y corte antes de proyectar", () => {
  assert.equal(officialOrderFromRow(BASE, {
    sourceUrl: "https://official.example/archive.7z",
    year: 2026,
    months: new Set([7]),
    cutoff: "2026-07-31",
  })?.code, BASE.codigoOC);
  assert.equal(officialOrderFromRow({ ...BASE, FechaEnvioOC: "2026-08-01" }, {
    sourceUrl: "https://official.example/archive.7z",
    year: 2026,
    months: new Set([7]),
    cutoff: "2026-08-20",
  }), null);
});

test("filas con columnas desplazadas se ponen en cuarentena", () => {
  const headers = Object.keys(BASE);
  assert.equal(hasExactOfficialOrderSchema(BASE, headers), true);
  assert.equal(hasExactOfficialOrderSchema({ ...BASE, _44: "extra" }, headers), false);
  const missing = { ...BASE };
  delete missing.ProveedorRUT;
  assert.equal(hasExactOfficialOrderSchema(missing, headers), false);
});

test("un mes sin órdenes oficiales no se publica como cero", () => {
  assert.equal(shouldPublishOfficialMonth(1), true);
  assert.equal(shouldPublishOfficialMonth(0), false);
});
