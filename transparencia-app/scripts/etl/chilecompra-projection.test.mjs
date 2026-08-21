import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateProjectionAmount,
  normalizeProjectionContract,
  sumKnownAmounts,
} from "./chilecompra-projection.mjs";

test("R10 conserva datos oficiales de una adjudicación", () => {
  assert.deepEqual(normalizeProjectionContract({
    title: "Servicio oficial",
    monto_clp: 0,
    suppliers: [{ id: "CL-MP-123", name: "PROVEEDOR OFICIAL SPA" }],
  }), {
    title: "Servicio oficial",
    monto_clp: 0,
    proveedor_id: "provider-chilecompra-123",
    proveedor: "PROVEEDOR OFICIAL SPA",
  });
});

test("R10 deja como null montos, títulos y proveedores ausentes", () => {
  assert.deepEqual(normalizeProjectionContract({ suppliers: [{ id: "CL-MP-123" }] }), {
    title: null,
    monto_clp: null,
    proveedor_id: "provider-chilecompra-123",
    proveedor: null,
  });
  assert.equal(sumKnownAmounts([null, undefined]), null);
  assert.equal(sumKnownAmounts([null, 0, 25]), 25);
});

test("V7 pone montos de relación fuera de rango en cuarentena", () => {
  assert.deepEqual(evaluateProjectionAmount(100_000_000_000), {
    monto_clp: 100_000_000_000,
    anomaly: null,
  });
  assert.deepEqual(evaluateProjectionAmount(100_000_000_001), {
    monto_clp: null,
    anomaly: { severity: "ALTA", validation: "V7", violations: ["monto_relacion"] },
  });
  assert.deepEqual(evaluateProjectionAmount(-1), {
    monto_clp: null,
    anomaly: { severity: "ALTA", validation: "V7", violations: ["monto_negativo"] },
  });
});
