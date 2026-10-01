import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assertReleaseCandidate } from "../release-candidate.mjs";

const checksum = (text) => createHash("sha256").update(text).digest("hex");
const candidate = () => ({
  sourceId: "camara", expectedSourceId: "camara", complete: true,
  periods: ["2026-09"], expectedPeriods: ["2026-09"],
  records: [{ id: "a" }, { id: "b" }], recordCount: 2,
  checksumSha256: checksum("candidate"), actualChecksumSha256: checksum("candidate"),
  previous: { recordCount: 2, checksumSha256: checksum("previous") },
});

describe("contrato común de candidatos ETL", () => {
  it("acepta el candidato completo sin modificar el rollback", () => {
    const input = candidate();
    const before = structuredClone(input.previous);
    expect(assertReleaseCandidate(input).status).toBe("valid_candidate");
    expect(input.previous).toEqual(before);
  });
  it("clasifica un checksum idéntico como sin cambios", () => {
    const input = candidate();
    input.previous.checksumSha256 = input.checksumSha256;
    expect(assertReleaseCandidate(input).status).toBe("unchanged");
  });
  it.each([
    ["identidad", { sourceId: "senado" }, "SOURCE_MISMATCH"],
    ["período distinto", { periods: ["2026-08"] }, "PERIOD_MISMATCH"],
    ["mes inválido", { periods: ["2026-13"] }, "PERIOD_INVALID"],
    ["fecha inexistente", { periods: ["2026-02-30"] }, "PERIOD_INVALID"],
    ["checksum alterado", { actualChecksumSha256: checksum("altered") }, "CHECKSUM_INVALID"],
    ["checksum ausente", { checksumSha256: null }, "CHECKSUM_INVALID"],
    ["conteo discordante", { recordCount: 3 }, "COUNT_INVALID"],
    ["duplicados", { records: [{ id: "a" }, { id: "a" }] }, "DUPLICATE_ID"],
    ["ID ausente", { records: [{ id: "a" }, {}] }, "ID_INVALID"],
    ["candidato incompleto", { complete: false }, "INCOMPLETE"],
    ["caída externa", { externalUnavailable: true }, "EXTERNAL_UNAVAILABLE"],
    ["cero inesperado", { records: [], recordCount: 0 }, "EMPTY"],
    ["reducción", { records: [{ id: "a" }], recordCount: 1 }, "COUNT_REGRESSION"],
  ])("bloquea %s conservando el release previo", (_name, patch, error) => {
    const input = { ...candidate(), ...patch };
    const previous = structuredClone(input.previous);
    expect(() => assertReleaseCandidate(input)).toThrow(error);
    expect(input.previous).toEqual(previous);
  });
  it("exige presupuesto antes de una publicación", () => {
    expect(() => assertReleaseCandidate({ ...candidate(), publication: true })).toThrow("BUDGET_REQUIRED");
  });
  it("no interpreta un presupuesto sin inventario como una cuenta vacía", () => {
    expect(() => assertReleaseCandidate({ ...candidate(), publication: true, budget: {} })).toThrow("BUDGET_REQUIRED");
  });
  it("reutiliza el bloqueo de almacenamiento al 95 %", () => {
    expect(() => assertReleaseCandidate({ ...candidate(), publication: true, budget: {
      currentObjects: [{ key: "active", size: 94 }], puts: [{ key: "new", size: 1 }], limitBytes: 100,
    } })).toThrow("R2_WRITE_BLOCKED_AT_95_PERCENT");
  });
  it("acepta presupuesto seguro sin escribir datos", () => {
    const result = assertReleaseCandidate({ ...candidate(), publication: true, budget: {
      currentObjects: [{ key: "active", size: 50 }], puts: [{ key: "new", size: 1 }], limitBytes: 100,
    } });
    expect(result.storageBudget.projectedBytes).toBe(51);
  });
});
