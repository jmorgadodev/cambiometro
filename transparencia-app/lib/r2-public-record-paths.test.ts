import { describe, expect, it } from "vitest";
import { staticRecordCandidatePaths, staticRecordRows } from "./r2-public-record-paths";

describe("rutas de registros estáticos en R2", () => {
  it("incluye el artefacto que publica el ETL de Movimientos", () => {
    expect(staticRecordCandidatePaths("movimientos")).toContain("data/movimientos.json");
  });

  it("no convierte el archivo específico de Movimientos en una ruta genérica para otras fuentes", () => {
    expect(staticRecordCandidatePaths("camara")).not.toContain("data/movimientos.json");
  });

  it("preserva el contrato histórico del payload de Movimientos", () => {
    const rows = [{ id: "mov-1" }];
    expect(staticRecordRows({ movimientos: rows })).toEqual(rows);
    expect(staticRecordRows({ records: rows })).toEqual(rows);
    expect(staticRecordRows(rows)).toEqual(rows);
    expect(staticRecordRows({ movimientos: "no-es-un-arreglo" })).toEqual([]);
  });
});
