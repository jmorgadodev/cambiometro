import { describe, expect, it } from "vitest";
import { buildLandingSummary, sourceKeyForHomeSource } from "../lib/landing-summary.ts";

describe("landing summary", () => {
  it("persiste conteos y fechas del snapshot sin consultar servicios externos", () => {
    const summary = buildLandingSummary({
      sourceHealth: {
        generatedAt: "2026-09-04T10:00:00Z",
        sources: {
          chilecompra: { recordCount: 74142, status: "partial", generatedAt: "2026-09-04T09:00:00Z" },
          movimientos: { recordCount: 79, status: "complete", generatedAt: "2026-09-04T10:00:00Z" },
        },
      },
      movements: {
        movimientos: Array.from({ length: 79 }, () => ({ id: "movement" })),
        last_success_at: "2026-09-04T08:00:00Z",
        last_event_date: "2026-08-27",
      },
      globalKpis: { registros_canonicos: 1753013, entidades: 3281, relaciones: 1897, votaciones: 12111, corte: "Septiembre 2026" },
    });

    expect(summary.sourceCount).toBe(2);
    expect(summary.totalSourceRecords).toBe(74221);
    expect(summary.movements.total).toBe(79);
    expect(summary.dataUpdatedAt).toBe("2026-09-04T10:00:00Z");
    expect(summary.canonical.records).toBe(1753013);
  });

  it("rechaza conteos y fechas inválidos sin inventar valores", () => {
    const summary = buildLandingSummary({
      sourceHealth: { sources: { broken: { recordCount: -4, generatedAt: "not-a-date" } } },
      movements: { movimientos: [], last_success_at: "invalid", last_event_date: null },
      globalKpis: {},
    });

    expect(summary.sources[0]).toMatchObject({ id: "broken", recordCount: 0, generatedAt: null });
    expect(summary.dataUpdatedAt).toBeNull();
    expect(summary.canonical).toMatchObject({ records: 0, cutoff: "Sin corte publicado" });
  });

  it("mantiene el vínculo explícito entre las tarjetas y el snapshot de salud", () => {
    expect(sourceKeyForHomeSource("etl_chilecompra_ocds")).toBe("chilecompra");
    expect(sourceKeyForHomeSource("etl_ine_censo_2024")).toBe("ine");
    expect(sourceKeyForHomeSource("unknown")).toBeNull();
  });
});
