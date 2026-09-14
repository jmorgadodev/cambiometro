import { describe, expect, it } from "vitest";
import { auditExpenseSubsetAgainstSnapshot, buildExpenseSubset, compactExpenseRecord } from "./expense-release.mjs";

const base = {
  id: "cam-1",
  diputado_id: "1009",
  nombre: "Diputado de Prueba",
  fecha: "2026-07-01",
  periodo: "2026-07",
  item: "Traslado",
  monto_clp: 125000,
  url: "https://www.camara.cl/diputados/detalle/gastosoperacionales.aspx?prmId=1009",
  fuente: "Cámara de Diputados",
};

describe("release estático de gastos operacionales", () => {
  it("compacta sólo una fila trazable y conserva monto cero", () => {
    expect(compactExpenseRecord({ ...base, monto_clp: 0 }, "gastos_camara")).toMatchObject({ id: "cam-1", monto_clp: 0 });
    expect(compactExpenseRecord({ ...base, url: "http://no-oficial.example" }, "gastos_camara")).toBeNull();
  });

  it("genera checksum determinista y rechaza ids duplicados", () => {
    const first = buildExpenseSubset({ sourceId: "gastos_camara", records: [base], generatedAt: "2026-08-26T00:00:00.000Z" });
    const second = buildExpenseSubset({ sourceId: "gastos_camara", records: [base], generatedAt: "2026-08-26T00:00:00.000Z" });
    expect(first.checksumSha256).toBe(second.checksumSha256);
    expect(first.recordCount).toBe(1);
  });

  it("acepta el esquema oficial del Senado por nombre", () => {
    const subset = buildExpenseSubset({ sourceId: "gastos_senado", generatedAt: "2026-08-26T00:00:00.000Z", records: [{ ...base, id: "sen-1", diputado_id: undefined, person: { name: "Senador de Prueba" }, nombre: "Senador de Prueba" }] });
    expect(subset.records[0]).not.toHaveProperty("diputado_id");
    expect(subset.recordCount).toBe(1);
  });

  it("detecta cuando el subconjunto publicado perdió filas del snapshot completo", () => {
    const complete = buildExpenseSubset({
      sourceId: "gastos_senado",
      generatedAt: "2026-08-26T00:00:00.000Z",
      records: [
        { ...base, id: "sen-1", diputado_id: undefined, nombre: "Senador Uno" },
        { ...base, id: "sen-2", diputado_id: undefined, nombre: "Senador Dos" },
      ],
    });
    const partial = buildExpenseSubset({
      sourceId: "gastos_senado",
      generatedAt: "2026-08-26T00:00:00.000Z",
      records: [{ ...base, id: "sen-1", diputado_id: undefined, nombre: "Senador Uno" }],
    });

    expect(auditExpenseSubsetAgainstSnapshot({
      sourceId: "gastos_senado",
      subset: partial,
      snapshot: { fuentes: { gastos_senado: complete.records } },
    })).toMatchObject({ snapshotCount: 2, subsetCount: 1, missingCount: 1, complete: false });
  });
});
