import { describe, expect, it } from "vitest";
import { buildTransferStageSql, releaseParity } from "../scripts/materialize-transferencias-d1.mjs";

const row = {
  id: "ley-19862-transfer-1",
  folio: "1",
  fecha: "2026-01-02",
  period: "2026",
  emitter_name: "Emisor O'Connor",
  receiver_name: "Receptor",
  title: "Aporte",
  monto_clp: 123,
  url: "https://registros19862.gob.cl/transferencia/1",
};

describe("materialización D1 de transferencias", () => {
  it("genera inserts acotados y escapa texto", () => {
    const sql = buildTransferStageSql([row], "run-test");
    expect(sql).toContain("run-test");
    expect(sql).toContain("Emisor O''Connor");
    expect(sql).toContain("123");
    expect(sql).toContain("stage_transferencias_19862");
  });

  it("exige paridad de filas y monto con el manifest", () => {
    expect(releaseParity({ rows: [row], manifest: { totalRows: 1, expected: { totalMontoClp: 123 } } })).toEqual({
      totalRows: 1,
      totalMontoClp: 123,
      rowsMatch: true,
      amountMatches: true,
    });
  });
});
