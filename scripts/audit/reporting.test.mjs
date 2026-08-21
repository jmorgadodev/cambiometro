import test from "node:test";
import assert from "node:assert/strict";

import { assertAltaSourceDisclosed, calculateAccuracy, classifyRootCause, correctionVerdict, verifyCauseCoverage } from "./reporting.mjs";

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

test("cierre de corrección rechaza ALTAS no trazadas o no visibles", () => {
  const valid = [{ id: "a", status: "ALTA", detail: { source_anomaly: true, site_disclosure: true } }];
  assert.doesNotThrow(() => assertAltaSourceDisclosed(valid));
  assert.throws(() => assertAltaSourceDisclosed([{ id: "b", status: "ALTA", detail: { source_anomaly: true } }]), /AUDIT_ALTA_NOT_DISCLOSED:b/);
  assert.throws(() => assertAltaSourceDisclosed([{ id: "c", status: "ALTA", detail: { site_disclosure: true } }]), /AUDIT_ALTA_NOT_DISCLOSED:c/);
});

test("veredicto de corrección mantiene gate cerrado ante una CRITICA", () => {
  assert.equal(correctionVerdict({ critical: 1, high: 0, coveragePct: 100 }), "NO");
  assert.equal(correctionVerdict({ critical: 0, high: 1, coveragePct: 100 }), "CON FIXES");
  assert.equal(correctionVerdict({ critical: 0, high: 0, coveragePct: 100 }), "SI");
});
