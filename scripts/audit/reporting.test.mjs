import test from "node:test";
import assert from "node:assert/strict";

import { calculateAccuracy, classifyRootCause, verifyCauseCoverage } from "./reporting.mjs";

test("exactitud excluye fuentes y capas no disponibles, cobertura no", () => {
  const rows = ["OK", "OK", "ALTA", "FUENTE_NO_DISPONIBLE", "CAPA_NO_DISPONIBLE"].map((status) => ({ status }));
  assert.deepEqual(calculateAccuracy(rows), { approved: 2, comparable: 3, total: 5, accuracyPct: 66.67, coveragePct: 60 });
});

test("cada ALTA y CRITICA recibe causa raíz", () => {
  const rows = [
    { id: "a", category: "gastos_operacionales", status: "CRITICA" },
    { id: "b", category: "compras", status: "CRITICA" },
    { id: "c", category: "asistencia", status: "OK" },
  ];
  assert.equal(classifyRootCause(rows[0]), "RC-01");
  assert.equal(classifyRootCause(rows[1]), "RC-03");
  assert.doesNotThrow(() => verifyCauseCoverage(rows));
});
