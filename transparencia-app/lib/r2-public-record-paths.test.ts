import { describe, expect, it } from "vitest";
import { staticRecordCandidatePaths, staticRecordRows } from "@/lib/r2-public-record-paths";

describe("rutas de releases estáticos públicos", () => {
  it("usa sólo el release reconciliado de Movimientos", () => {
    expect(staticRecordCandidatePaths("movimientos")).toEqual(["data/movimientos.json"]);
  });

  it("mantiene las rutas de proyección para las demás fuentes", () => {
    expect(staticRecordCandidatePaths("camara")).toEqual([
      "data/lake/projections/v1/camara.json",
      "data/lake-subsets/camara.subset.json",
    ]);
  });

  it("conserva el contrato histórico movimientos del payload", () => {
    expect(staticRecordRows({ movimientos: [{ id: "mov-1" }] })).toEqual([{ id: "mov-1" }]);
  });
});
