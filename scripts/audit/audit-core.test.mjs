import test from "node:test";
import assert from "node:assert/strict";

import {
  deterministicSample,
  extractRscPrimitives,
  normalizeRut,
  normalizeText,
  parseClp,
  validateV1,
  validateV2,
  validateV3,
  validateV4,
  validateV5,
  validateV6,
  validateV7,
} from "./audit-core.mjs";

test("parseClp normaliza moneda chilena sin perder el signo", () => {
  assert.equal(parseClp("$ 4.582.550"), 4_582_550);
  assert.equal(parseClp("-$1.250"), -1_250);
  assert.equal(parseClp(15_250_000), 15_250_000);
});

test("normalizadores producen claves comparables", () => {
  assert.equal(normalizeText("  Región de Ñuble  "), "region de nuble");
  assert.equal(normalizeRut("12.345.678-k"), "12345678K");
});

test("V1 exige igualdad monetaria exacta", () => {
  assert.equal(validateV1({ officialTotal: 10, items: [4, 6] }).status, "OK");
  const failure = validateV1({ officialTotal: 10, items: [4, 7] });
  assert.equal(failure.status, "CRITICA");
  assert.equal(failure.difference, 1);
});

test("V2 distingue asignación, 40 por ciento y exceso crítico", () => {
  assert.equal(validateV2({ assignment: 100, salaries: [60, 40] }).status, "OK");
  assert.equal(validateV2({ assignment: 100, salaries: [101] }).status, "ALTA");
  assert.equal(validateV2({ assignment: 100, salaries: [140] }).status, "ALTA");
  assert.equal(validateV2({ assignment: 100, salaries: [141] }).status, "CRITICA");
});

test("V3 conserva presente sin votar en la identidad", () => {
  assert.equal(validateV3({ total: 10, favor: 4, against: 3, abstentions: 1, presentNoVote: 2 }).status, "OK");
  assert.equal(validateV3({ total: 9, favor: 4, against: 3, abstentions: 1, presentNoVote: 2 }).status, "CRITICA");
});

test("V4 acepta exactamente medio punto porcentual", () => {
  assert.equal(validateV4({ numerator: 75, denominator: 100, officialSessions: 100, publishedPercent: 75.5 }).status, "OK");
  assert.equal(validateV4({ numerator: 75, denominator: 100, officialSessions: 100, publishedPercent: 75.51 }).status, "ALTA");
  assert.equal(validateV4({ numerator: 101, denominator: 100, officialSessions: 100, publishedPercent: 100 }).status, "ALTA");
});

test("V5 usa tolerancia cero", () => {
  assert.equal(validateV5({ publishedTotal: 6, components: [1, 2, 3] }).status, "OK");
  assert.equal(validateV5({ publishedTotal: 6.01, components: [1, 2, 3] }).status, "CRITICA");
});

test("V6 separa diferencias textuales de RUT y partido", () => {
  assert.equal(validateV6({ official: { name: "Ana Pérez", rut: "1-9", party: "IND", role: "Diputada" }, published: { name: "Ana Perez", rut: "1-9", party: "IND", role: "Diputada" } }).status, "MENOR");
  assert.equal(validateV6({ official: { name: "Ana", rut: "1-9", party: "IND", role: "Diputada" }, published: { name: "Ana", rut: "2-7", party: "IND", role: "Diputada" } }).status, "ALTA");
  assert.equal(validateV6({ official: { name: "Ana", rut: null, party: "IND", role: "Diputada" }, published: { name: "Ana", rut: null, party: "IND", role: "Diputada" } }).status, "OK");
});

test("V7 aplica los cuatro límites estrictos", () => {
  assert.equal(validateV7({ monthlySalary: 60_000_000, overtimeHours: 300, relationAmount: 100, annualOrganizationTotal: 100, operationalExpenses: 140, regionalAssignment: 100 }).status, "OK");
  assert.equal(validateV7({ monthlySalary: 60_000_001 }).status, "ALTA");
  assert.equal(validateV7({ overtimeHours: 301 }).status, "ALTA");
});

test("muestreo por hash es estable y toma ceil del porcentaje", () => {
  const rows = Array.from({ length: 21 }, (_, index) => ({ id: `row-${index}` }));
  const first = deterministicSample(rows, 0.1, (row) => row.id);
  const second = deterministicSample([...rows].reverse(), 0.1, (row) => row.id);
  assert.equal(first.length, 3);
  assert.deepEqual(first, second);
});

test("parser RSC recupera primitivos de frames Flight válidos", () => {
  const payload = [
    '0:{"name":"Vanessa Kaiser","total":4582550,"children":["$ 4.582.550",7]}',
    '1:["Personal de apoyo",15250000]',
    '2:I[123,["chunk.js"],"default"]',
  ].join("\n");
  const values = extractRscPrimitives(payload);
  assert.ok(values.includes("Vanessa Kaiser"));
  assert.ok(values.includes(4_582_550));
  assert.ok(values.includes("$ 4.582.550"));
  assert.ok(values.includes(15_250_000));
});
