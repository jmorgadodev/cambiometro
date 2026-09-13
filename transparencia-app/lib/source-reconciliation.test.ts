import { describe, expect, it } from "vitest";
import { mergeLocalHealth, reconcileSourceSnapshots, sourceCategories } from "./source-reconciliation.mjs";

describe("auditoría de reconciliación producción/R2/local", () => {
  it("clasifica como frescura una producción más nueva sin llamarlo pérdida", () => {
    const report = reconcileSourceSnapshots({
      production: [{ id: "movimientos", recordCount: 80, lastUpdated: "2026-09-08T00:00:00Z", status: "connected" }] as never,
      local: [{ id: "movimientos", recordCount: 78, generatedAt: "2026-08-28T00:00:00Z", status: "partial" }] as never,
    });

    expect(report.rows[0]).toMatchObject({ id: "movimientos", classification: "freshness", productionCount: 80, localCount: 78 });
  });

  it("marca alcance cuando un padre local está dividido en categorías", () => {
    const report = reconcileSourceSnapshots({
      production: [{ id: "camara", recordCount: 55_323, lastUpdated: "2026-09-02", status: "partial" }] as never,
      local: [
        { id: "camara", recordCount: 13_286, generatedAt: "2026-08-24", status: "partial" },
        { id: "gastos_camara", recordCount: 16_275, generatedAt: "2026-08-24", status: "partial" },
        { id: "votaciones_camara", recordCount: 189, generatedAt: "2026-08-24", status: "partial" },
      ] as never,
    });

    const row = report.rows.find((item) => item.id === "camara");
    expect(row?.classification).toBe("scope");
    expect(row?.localCategories).toEqual(expect.arrayContaining(["remuneraciones", "gastos", "votaciones"]));
  });

  it("no inventa una explicación cuando producción y local no tienen señal suficiente", () => {
    const report = reconcileSourceSnapshots({
      production: [{ id: "fuente-nueva", recordCount: 10, lastUpdated: null, status: "partial" }] as never,
      local: [{ id: "fuente-nueva", recordCount: 3, generatedAt: null, status: "partial" }] as never,
    });

    expect(report.rows[0].classification).toBe("unexplained");
  });

  it("separa categorías parlamentarias sin sumar categorías distintas", () => {
    expect(sourceCategories("gastos_senado")).toEqual(["gastos"]);
    expect(sourceCategories("votaciones_senado")).toEqual(["votaciones"]);
    expect(sourceCategories("senado")).toEqual(["remuneraciones", "asesorias", "gastos", "votaciones"]);
  });

  it("mantiene el conteo del catálogo y deja source-health como señal de snapshot", () => {
    const local = mergeLocalHealth(
      {
        generatedAt: "2026-09-11T00:00:00Z",
        sources: [{ id: "camara", recordCount: 58_819, foundPeriods: [], status: "partial" }],
      },
      { sources: { camara: { recordCount: 19_025, generatedAt: "2026-08-21T00:00:00Z", status: "partial" } } },
    );
    const report = reconcileSourceSnapshots({
      production: [{ id: "camara", recordCount: 58_819, lastUpdated: "2026-09-02T00:00:00Z", status: "partial" }] as never,
      local: local as never,
    });

    expect(report.rows[0]).toMatchObject({
      classification: "match",
      localCount: 58_819,
      localHealthCount: 19_025,
      healthMismatch: true,
    });
    expect(report.summary.healthMismatch).toBe(1);
  });
});
