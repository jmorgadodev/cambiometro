import { describe, expect, it } from "vitest";
import { CAMARA_CURRENT_PERIOD_START, resolveCamaraVoteWindow } from "./camara-history.mjs";

describe("ventana histórica de Cámara", () => {
  it("reconstruye desde la fecha solicitada cuando se confirma el histórico", () => {
    expect(resolveCamaraVoteWindow({
      requestedFrom: "2024-01-01",
      previousRecords: [{ fecha: "2026-09-01" }],
      fullHistory: true,
    })).toEqual({ from: "2024-01-01", minimumFrom: "2024-01-01" });
  });

  it("mantiene la ventana incremental acotada en el ETL diario", () => {
    expect(resolveCamaraVoteWindow({
      requestedFrom: "2026-08-25",
      previousRecords: [{ fecha: "2026-08-28" }],
      overlapDays: 3,
    })).toEqual({ from: "2026-08-25", minimumFrom: CAMARA_CURRENT_PERIOD_START });
  });
});
