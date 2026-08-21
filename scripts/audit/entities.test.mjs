import test from "node:test";
import assert from "node:assert/strict";

import { deduplicateBy, requireFields, sampleByEntity, sumNumericFields } from "./entities.mjs";

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
