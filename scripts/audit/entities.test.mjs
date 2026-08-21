import test from "node:test";
import assert from "node:assert/strict";

import { auditQuarantinedV7, classifyR10PurchaseLayer, deduplicateBy, requireFields, sampleByEntity, sumNumericFields } from "./entities.mjs";

test("esquema inválido se rechaza con campos explícitos", () => {
  assert.throws(() => requireFields([{ id: "a" }], ["id", "amount"], "fixture"), /AUDIT_INVALID_SCHEMA:fixture:amount/);
});

test("deduplicación conserva orden y reporta claves repetidas", () => {
  const result = deduplicateBy([{ id: "b" }, { id: "a" }, { id: "b" }], (row) => row.id);
  assert.deepEqual(result.rows, [{ id: "b" }, { id: "a" }]);
  assert.deepEqual(result.duplicates, ["b"]);
});

test("muestreo del diez por ciento se aplica por entidad", () => {
  const rows = [
    ...Array.from({ length: 11 }, (_, index) => ({ org: "a", id: `a-${index}` })),
    ...Array.from({ length: 20 }, (_, index) => ({ org: "b", id: `b-${index}` })),
  ];
  const sampled = sampleByEntity(rows, 0.1, (row) => row.org, (row) => row.id);
  assert.equal(sampled.filter((row) => row.org === "a").length, 2);
  assert.equal(sampled.filter((row) => row.org === "b").length, 2);
});

test("sumas numéricas no concatenan strings", () => {
  assert.deepEqual(sumNumericFields([{ amount: "2", count: 1 }, { amount: 3, count: "4" }], ["amount", "count"]), { amount: 5, count: 5 });
});

test("filas V7 en cuarentena permanecen ALTA y fuera de datos regulares", () => {
  const regularIds = new Set(["regular"]);
  const rows = auditQuarantinedV7([{
    id: "anomaly",
    severity: "ALTA",
    validation: "V7",
    violations: ["sueldo_mensual"],
    source_url: "https://www.portaltransparencia.cl/ficha",
    record: { id: "anomaly", remuneracion_bruta_mensual: 60_000_001, horas_extras_mes_anterior: 10 },
  }], regularIds);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "ALTA");
  assert.deepEqual(rows[0].violations, ["sueldo_mensual"]);
  assert.equal(rows[0].excludedFromRegular, true);
});

test("una fila V7 no puede coexistir en cuarentena y rankings regulares", () => {
  assert.throws(() => auditQuarantinedV7([{
    id: "duplicated",
    severity: "ALTA",
    validation: "V7",
    violations: ["horas_extras"],
    record: { id: "duplicated", horas_extras_mes_anterior: 301 },
  }], new Set(["duplicated"])), /AUDIT_V7_QUARANTINE_LEAK/);
});

test("R10 trata ausencia de compras como fuente no disponible, nunca como cero", () => {
  assert.deepEqual(classifyR10PurchaseLayer({ projection: null, site: null }), {
    status: "FUENTE_NO_DISPONIBLE",
    difference: null,
  });
  assert.deepEqual(classifyR10PurchaseLayer({ projection: 0, site: 0 }), {
    status: "OK",
    difference: 0,
  });
  assert.deepEqual(classifyR10PurchaseLayer({ projection: 12, site: 10 }), {
    status: "CRITICA",
    difference: 2,
  });
});
