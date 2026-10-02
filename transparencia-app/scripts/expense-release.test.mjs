import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildExpensePeriodShards, buildExpenseSubset, compactExpenseRecord, isValidExpenseAmount, sanitizeExpenseSubsetForPublication, writeExpensePeriodArtifacts, retainPublishedExpensePeriods } from "./expense-release.mjs";

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
  it("conserva meses históricos del manifiesto R2 cuando el candidato sólo refresca un mes", () => {
    const path = (period) => `data/lake-subsets/expense-periods/gastos_senado/${period}.json`;
    const index = { sources: [{ sourceId: "gastos_senado", periods: [{ period: "2026-07", path: path("2026-07"), recordCount: 1251 }] }] };
    const published = { files: [
      { sourceId: "gastos_senado", period: "2012-01", path: path("2012-01"), recordCount: 307 },
      { sourceId: "gastos_senado", period: "2026-07", path: path("2026-07"), recordCount: 1250 },
      { sourceId: "gastos_camara", period: "2026-06", path: "data/lake-subsets/expense-periods/gastos_camara/2026-06.json", recordCount: 3255 },
    ] };
    expect(retainPublishedExpensePeriods(index, published).sources[0].periods).toEqual([
      { period: "2012-01", path: path("2012-01"), recordCount: 307 }, index.sources[0].periods[0],
    ]);
    expect(index.sources[0].periods).toHaveLength(1);
  });
  it("retira matrices amplias de ceros y períodos prematuros sólo de la vista publicada", () => {
    const records = [
      { ...base, id: "cam-june", periodo: "2026-06", fecha: "2026-06-01", monto_clp: 1000 },
      ...Array.from({ length: 200 }, (_, index) => ({
        ...base,
        id: `cam-july-${index}`,
        diputado_id: String(2000 + Math.floor(index / 10)),
        periodo: "2026-07",
        fecha: "2026-07-01",
        item: `Ítem ${index % 10}`,
        monto_clp: 0,
      })),
      { ...base, id: "cam-august", periodo: "2026-08", fecha: "2026-08-01", monto_clp: 1000 },
    ];
    const rawSubset = buildExpenseSubset({ sourceId: "gastos_camara", records, generatedAt: "2026-09-27T00:00:00.000Z" });

    const result = sanitizeExpenseSubsetForPublication(rawSubset);

    expect(result.subset.periods).toEqual(["2026-06"]);
    expect(result.subset.records.map((record) => record.id)).toEqual(["cam-june"]);
    expect(result.excludedPeriods).toEqual([
      { period: "2026-07", reason: "broad-all-zero-matrix", rows: 200 },
      { period: "2026-08", reason: "not-yet-published", rows: 1 },
    ]);
    expect(rawSubset.records).toHaveLength(202);
  });

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

  it("genera fragmentos mensuales ordenados y trazables desde el release validado", () => {
    const subset = buildExpenseSubset({
      sourceId: "gastos_camara",
      generatedAt: "2026-09-27T00:00:00.000Z",
      records: [
        { ...base, id: "may-2", periodo: "2026-05", fecha: "2026-05-20" },
        { ...base, id: "apr-1", periodo: "2026-04", fecha: "2026-04-10" },
        { ...base, id: "may-1", periodo: "2026-05", fecha: "2026-05-05" },
      ],
    });

    expect(buildExpensePeriodShards(subset)).toEqual([
      {
        period: "2026-04",
        payload: { sourceId: "gastos_camara", period: "2026-04", recordCount: 1, records: [subset.records.find((record) => record.id === "apr-1")] },
      },
      {
        period: "2026-05",
        payload: { sourceId: "gastos_camara", period: "2026-05", recordCount: 2, records: [subset.records.find((record) => record.id === "may-2"), subset.records.find((record) => record.id === "may-1")] },
      },
    ]);
  });

  it("mantiene inmutable el checksum de un mes cuyo contenido no cambió", () => {
    const first = buildExpenseSubset({ sourceId: "gastos_camara", generatedAt: "2026-09-26T00:00:00.000Z", records: [base] });
    const nextRun = buildExpenseSubset({ sourceId: "gastos_camara", generatedAt: "2026-09-27T00:00:00.000Z", records: [base] });

    expect(buildExpensePeriodShards(first)[0].payload).toEqual(buildExpensePeriodShards(nextRun)[0].payload);
  });

  it("rechaza fragmentos mensuales con fuente o período inválidos", () => {
    expect(() => buildExpensePeriodShards({ sourceId: "gastos_unknown", records: [{ ...base }] }))
      .toThrow("EXPENSE_PERIOD_SHARD_SOURCE_MISMATCH");
    expect(() => buildExpensePeriodShards({ sourceId: "gastos_camara", records: [{ ...base, periodo: "2026-13" }] }))
      .toThrow("EXPENSE_PERIOD_SHARD_PERIOD_INVALID");
  });

  it("prepara índice y fragmentos al publicar, incluyendo fuentes sin meses", () => {
    const root = mkdtempSync(join(tmpdir(), "expense-period-artifacts-"));
    try {
      const sourceDirectory = join(root, "data", "lake-subsets");
      mkdirSync(sourceDirectory, { recursive: true });
      const subset = buildExpenseSubset({ sourceId: "gastos_camara", generatedAt: "2026-09-27T00:00:00.000Z", records: [base] });
      writeFileSync(join(sourceDirectory, "gastos-camara.subset.json"), JSON.stringify(subset));

      const result = writeExpensePeriodArtifacts(root, "2026-09-27T00:00:00.000Z");
      const shardPath = join(root, "data", "lake-subsets", "expense-periods", "gastos_camara", "2026-07.json");

      expect(result.index.sources).toEqual([
        { sourceId: "gastos_camara", periods: [{ period: "2026-07", path: "data/lake-subsets/expense-periods/gastos_camara/2026-07.json", recordCount: 1 }] },
        { sourceId: "gastos_senado", periods: [] },
      ]);
      expect(JSON.parse(readFileSync(shardPath, "utf8"))).toMatchObject({ sourceId: "gastos_camara", period: "2026-07", recordCount: 1 });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("acepta el esquema oficial del Senado por nombre", () => {
    const subset = buildExpenseSubset({ sourceId: "gastos_senado", generatedAt: "2026-08-26T00:00:00.000Z", records: [{ ...base, id: "sen-1", diputado_id: undefined, person: { name: "Senador de Prueba" }, nombre: "Senador de Prueba" }] });
    expect(subset.records[0]).not.toHaveProperty("diputado_id");
    expect(subset.recordCount).toBe(1);
  });

  it("conserva rendiciones oficiales aunque el monto no esté publicado", () => {
    const record = compactExpenseRecord({ ...base, id: "sen-no-amount", monto_clp: null }, "gastos_senado");

    expect(record).toMatchObject({ id: "sen-no-amount", monto_clp: null });
  });

  it("conserva montos negativos oficiales del Senado sin aceptarlos para Cámara", () => {
    const senateRecord = compactExpenseRecord({ ...base, id: "sen-adjustment", monto_clp: -171017 }, "gastos_senado");
    const chamberRecord = compactExpenseRecord({ ...base, id: "cam-adjustment", monto_clp: -171017 }, "gastos_camara");

    expect(senateRecord).toMatchObject({ id: "sen-adjustment", monto_clp: -171017 });
    expect(chamberRecord).toBeNull();
    expect(isValidExpenseAmount(-171017, "gastos_senado")).toBe(true);
    expect(isValidExpenseAmount(-171017, "gastos_camara")).toBe(false);
    expect(isValidExpenseAmount(null, "gastos_senado")).toBe(true);
    expect(isValidExpenseAmount(1.5, "gastos_senado")).toBe(false);
  });

  it("conserva filas sin nombre ni monto y no las cuenta como una persona identificada", () => {
    const subset = buildExpenseSubset({
      sourceId: "gastos_senado",
      generatedAt: "2026-08-26T00:00:00.000Z",
      records: [{ ...base, id: "sen-unreported", diputado_id: undefined, nombre: "", person: { name: "" }, monto_clp: null }],
    });

    expect(subset.recordCount).toBe(1);
    expect(subset.politicianCount).toBe(0);
    expect(subset.records[0]).toMatchObject({ id: "sen-unreported", monto_clp: null });
  });
});
