import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeOperationalExpenseGroup,
  analyzeSupportAssignment,
  compareRscWithHtml,
  isCorrectedKaiserCalibration,
  reconcileRoster,
  selectRscValidationSample,
} from "./parliamentary.mjs";

test("V1 separa VALOR TOTAL y valida la proyección corregida sin duplicarlo", () => {
  const records = [
    { title: "CORRESPONDENCIA", monto_clp: 1_000_000 },
    { title: "TRASLACION VEHICULO", monto_clp: 3_582_550 },
    { title: "VALOR TOTAL", monto_clp: 4_582_550 },
  ];
  const result = analyzeOperationalExpenseGroup(records, { projectedTotal: 4_582_550 });
  assert.equal(result.officialTotal, 4_582_550);
  assert.equal(result.itemSum, 4_582_550);
  assert.equal(result.projectedVisibleTotal, 4_582_550);
  assert.equal(result.naiveSumIncludingSummary, 9_165_100);
  assert.equal(result.sourceIntegrity.status, "OK");
  assert.equal(result.publicationIntegrity.status, "OK");
});

test("V1 conserva una regresión que rechaza volver a sumar la fila resumen", () => {
  const records = [
    { title: "CONCEPTO", monto_clp: 4_582_550 },
    { title: "VALOR TOTAL", monto_clp: 4_582_550 },
  ];
  const result = analyzeOperationalExpenseGroup(records, { projectedTotal: 9_165_100 });
  assert.equal(result.publicationIntegrity.status, "CRITICA");
});

test("control V2 Kaiser conserva los valores y severidad aprobados", () => {
  const result = analyzeSupportAssignment({ assignment: 11_406_149, salaries: [1_200_000, 950_000, 3_800_000, 4_000_000, 300_000, 2_500_000, 2_500_000] });
  assert.equal(result.salarySum, 15_250_000);
  assert.equal(result.validation.status, "ALTA");
  assert.equal(result.validation.difference, 3_843_851);
});

test("calibración Kaiser posterior a FIX-1 exige total V1 corregido", () => {
  const calibration = {
    expenses_may: { official: 4_582_550, items: 4_582_550, status: "OK" },
    support_july: { assignment: 11_406_149, salaries: 15_250_000, status: "ALTA" },
  };
  assert.equal(isCorrectedKaiserCalibration(calibration), true);
  assert.equal(isCorrectedKaiserCalibration({
    ...calibration,
    expenses_may: { official: 4_582_550, items: 9_165_100, status: "CRITICA" },
  }), false);
});

test("reconciliación de roster es independiente de tildes y orden de entrada", () => {
  const official = [
    { name: "José Pérez Soto", chamber: "camara" },
    { name: "Ana Núñez", chamber: "senado" },
  ];
  const published = [
    { id: "sen-001", nombre_completo: "Ana Nunez", cargo: "Senador" },
    { id: "dip-001", nombre_completo: "José Pérez Soto", cargo: "Diputado" },
  ];
  const result = reconcileRoster(official, published);
  assert.equal(result.matches.length, 2);
  assert.deepEqual(result.unmatchedOfficial, []);
  assert.deepEqual(result.unmatchedPublished, []);
});

test("muestra RSC incluye Kaiser más dos miembros estables de cada cámara", () => {
  const rows = [
    { id: "sen-038", cargo: "Senador" },
    ...Array.from({ length: 5 }, (_, index) => ({ id: `sen-00${index + 1}`, cargo: "Senador" })),
    ...Array.from({ length: 5 }, (_, index) => ({ id: `dip-00${index + 1}`, cargo: "Diputado" })),
  ];
  const sample = selectRscValidationSample(rows);
  assert.equal(sample.length, 5);
  assert.ok(sample.some((row) => row.id === "sen-038"));
  assert.equal(sample.filter((row) => row.cargo === "Senador" && row.id !== "sen-038").length, 2);
  assert.equal(sample.filter((row) => row.cargo === "Diputado").length, 2);
});

test("comparación RSC/HTML exige todos los valores auditados", () => {
  const rsc = '0:{"children":["Ana Pérez","Senador","$ 4.582.550"]}';
  const html = '<h1>Ana Pérez</h1><span>Senador</span><strong>$ 4.582.550</strong>';
  assert.equal(compareRscWithHtml({ rsc, html, expected: ["Ana Pérez", "Senador", 4_582_550] }).ok, true);
  assert.equal(compareRscWithHtml({ rsc, html: '<h1>Ana Pérez</h1>', expected: ["Ana Pérez", "Senador"] }).ok, false);
});
