import { describe, expect, it } from "vitest";
import { buildLakePlan } from "../lake.mjs";
import { buildSenateSources, senateSourceId } from "../senado-source-map.mjs";

describe("separación de datasets del Senado", () => {
  it("conserva dietas bajo senado y separa gastos, pasajes y misiones", () => {
    expect(senateSourceId("diet")).toBe("senado");
    expect(senateSourceId("operational_expenses")).toBe("gastos_senado");
    expect(senateSourceId("domestic_tickets")).toBe("senado_pasajes");
    expect(senateSourceId("foreign_missions")).toBe("senado_misiones");
  });

  it("no concatena categorías diferentes en una sola fuente", () => {
    const sources = buildSenateSources([
      { dataset: "diet", records: [{ id: "diet-1", kind: "remuneration" }] },
      { dataset: "operational_expenses", records: [{ id: "expense-1", kind: "expense" }] },
      { dataset: "domestic_tickets", records: [{ id: "ticket-1", kind: "expense" }] },
      { dataset: "foreign_missions", records: [{ id: "mission-1", kind: "expense" }] },
    ]);

    expect(Object.keys(sources).sort()).toEqual(["gastos_senado", "senado", "senado_misiones", "senado_pasajes"]);
    expect(sources.senado).toEqual([{ id: "diet-1", kind: "remuneration" }]);
    expect(sources.gastos_senado).toEqual([{ id: "expense-1", kind: "expense" }]);
    expect(sources.senado_pasajes).toEqual([{ id: "ticket-1", kind: "expense" }]);
    expect(sources.senado_misiones).toEqual([{ id: "mission-1", kind: "expense" }]);
  });

  it("produce particiones separadas aunque compartan período", () => {
    const sources = buildSenateSources([
      { dataset: "diet", records: [{ id: "diet-1", fecha: "2026-07-01", kind: "remuneration", url: "https://senado.cl/dietas" }] },
      { dataset: "operational_expenses", records: [{ id: "expense-1", fecha: "2026-07-01", kind: "expense", url: "https://senado.cl/gastos" }] },
      { dataset: "domestic_tickets", records: [{ id: "ticket-1", fecha: "2026-07-01", kind: "expense", url: "https://senado.cl/pasajes" }] },
      { dataset: "foreign_missions", records: [{ id: "mission-1", fecha: "2026-07-01", kind: "expense", url: "https://senado.cl/misiones" }] },
    ]);
    const plan = buildLakePlan({ actualizado_en: "2026-09-16T00:00:00.000Z", fuentes: sources });
    expect(plan.catalog.partitions.map((item) => item.id)).toEqual([
      "gastos_senado/2026/07",
      "senado_misiones/2026/07",
      "senado_pasajes/2026/07",
      "senado/2026/07",
    ]);
    expect(plan.catalog.partitions.every((item) => item.recordCount === 1)).toBe(true);
  });
});
