import test from "node:test";
import assert from "node:assert/strict";

import { evaluatePipelineReports } from "./pipeline-guard.mjs";

const reportsFor = (statusByValidation = {}) => [
  {
    findings: Array.from({ length: 7 }, (_, index) => {
      const validation = `V${index + 1}`;
      const status = statusByValidation[validation] ?? "OK";
      return { id: validation, validation, status, severity: status };
    }),
  },
];

test("guard V1-V7 aprueba cobertura completa sin CRITICA", () => {
  const result = evaluatePipelineReports(reportsFor({ V2: "ALTA", V7: "ALTA" }));
  assert.equal(result.ok, true);
  assert.equal(result.critical, 0);
  assert.deepEqual(result.covered, ["V1", "V2", "V3", "V4", "V5", "V6", "V7"]);
});

test("guard retorna fallo ante cualquier CRITICA", () => {
  const result = evaluatePipelineReports(reportsFor({ V3: "CRITICA" }));
  assert.equal(result.ok, false);
  assert.equal(result.critical, 1);
  assert.deepEqual(result.criticalIds, ["V3"]);
});

test("guard bloquea una auditoría que omite un validador", () => {
  const reports = reportsFor();
  reports[0].findings = reports[0].findings.filter((finding) => finding.validation !== "V6");
  const result = evaluatePipelineReports(reports);
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ["V6"]);
});
