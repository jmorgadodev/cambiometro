import { describe, expect, it } from "vitest";
import { assertSuccessfulRun, validateAsset, validatePublication } from "../scripts/etl/validation.mjs";

const record = (id: string) => ({
  id,
  fecha: "2026-08-12",
  url: `https://fuente-oficial.test/${id}`,
});

describe("validacion previa a publicar datos", () => {
  it("rechaza una fuente requerida sin registros", () => {
    expect(() => validatePublication({ sourceId: "cplt-honorarios", records: [], minimumCount: 1 }))
      .toThrow("ETL_EMPTY_SOURCE");
  });

  it("rechaza IDs duplicados y registros sin trazabilidad oficial", () => {
    expect(() => validatePublication({
      sourceId: "camara",
      records: [record("voto-1"), record("voto-1")],
    })).toThrow("ETL_DUPLICATE_ID");

    expect(() => validatePublication({
      sourceId: "camara",
      records: [{ id: "voto-1", fecha: "2026-08-12" }],
    })).toThrow("ETL_MISSING_SOURCE");
  });

  it("bloquea una caida anormal respecto del ultimo lote valido", () => {
    expect(() => validatePublication({
      sourceId: "cplt-planta",
      records: Array.from({ length: 40 }, (_, index) => record(`persona-${index}`)),
      previousCount: 100,
      minimumRetainedRatio: 0.5,
    })).toThrow("ETL_UNEXPECTED_DROP");
  });

  it("acepta un lote trazable y devuelve un informe reproducible", () => {
    expect(validatePublication({
      sourceId: "camara",
      records: [record("voto-2"), record("voto-1")],
      previousCount: 2,
    })).toMatchObject({ sourceId: "camara", recordCount: 2, status: "valid" });
  });

  it("rechaza assets vacios aunque el workflow haya terminado", () => {
    expect(() => validateAsset({ name: "funcionarios_honorarios.json", size: 5, recordCount: 0 }))
      .toThrow("ETL_INVALID_ASSET");
  });

  it("hace fallar la ejecucion cuando una fuente conserva datos obsoletos", () => {
    expect(() => assertSuccessfulRun(["InfoLobby: HTTP 500"]))
      .toThrow("ETL_SOURCE_FAILURE");
    expect(assertSuccessfulRun([])).toEqual({ status: "success" });
  });
});
