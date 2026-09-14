import { describe, expect, it } from "vitest";
import { buildCpltAggregateSummary, buildCpltTransparencySummary, reclassifyCpltSummary } from "../scripts/cplt-transparency-summary.mjs";

describe("resumen agregado de Transparencia Activa", () => {
  it("calcula cortes, altas, bajas, cambios y estados de monto sin exponer filas", () => {
    const summary = buildCpltTransparencySummary([
      { nombre_completo: "Ana Pérez", organo_nombre: "Municipalidad A", tipo_contrato: "Planta", cargo: "Analista", remuneracion_bruta_mensual: 100, fuente_periodo: "2026-01" },
      { nombre_completo: "Bruno Soto", organo_nombre: "Municipalidad A", tipo_contrato: "Contrata", cargo: "Técnico", remuneracion_bruta_mensual: 0, fuente_periodo: "2026-01" },
      { nombre_completo: "Ana Pérez", organo_nombre: "Municipalidad A", tipo_contrato: "Planta", cargo: "Analista", remuneracion_bruta_mensual: 125, fuente_periodo: "2026-02" },
      { nombre_completo: "Carla Ríos", organo_nombre: "Municipalidad B", tipo_contrato: "Honorarios", cargo: "Asesora", remuneracion_bruta_mensual: null, fuente_periodo: "2026-02", calidad_datos: { incidencias: ["remuneracion_liquida_no_informada"] } },
    ], [
      { communeId: "muni-a", cut: "01001", status: "available" },
      { communeId: "muni-b", cut: "01002", status: "unavailable" },
      { communeId: "muni-c", cut: "01003", status: "not_applicable" },
    ], "2026-02-01T00:00:00.000Z");

    expect(summary.recordCount).toBe(4);
    expect(summary.latestPeriod).toBe("2026-02");
    expect(summary.periods).toEqual(expect.arrayContaining([
      expect.objectContaining({ period: "2026-02", newRecords: 1, removedRecords: 1, amountChanges: 1, amountDelta: 25 }),
    ]));
    expect(summary.coverage).toMatchObject({ total: 3, available: 1, unavailable: 1, notApplicable: 1 });
    expect(summary.quality.amountStates).toEqual({ positive: 2, zero: 1, notPublished: 1 });
    expect(summary.quality.recordsWithIssues).toBe(1);
    expect(summary.periods.at(-1)).toEqual(expect.objectContaining({ organismChanges: 0, roleChanges: 0 }));
    expect(summary.latestPeriodStatus).toBe("comparable");
    expect(summary).not.toHaveProperty("rows");
  });

  it("detecta cambios de organismo y cargo aunque la fila cambie de organismo", () => {
    const summary = buildCpltTransparencySummary([
      { nombre_completo: "Ana Pérez", organo_nombre: "Municipalidad A", tipo_contrato: "Planta", cargo: "Analista", remuneracion_bruta_mensual: 100, fuente_periodo: "2026-01" },
      { nombre_completo: "Ana Pérez", organo_nombre: "Municipalidad B", tipo_contrato: "Planta", cargo: "Coordinadora", remuneracion_bruta_mensual: 120, fuente_periodo: "2026-02" },
    ], [], "2026-02-01T00:00:00.000Z");

    expect(summary.periods.at(-1)).toEqual(expect.objectContaining({ amountChanges: 1, organismChanges: 1, roleChanges: 1 }));
  });

  it("descarta períodos imposibles o posteriores al release", () => {
    const summary = buildCpltTransparencySummary([
      { nombre_completo: "Ana Pérez", organo_nombre: "Municipalidad A", tipo_contrato: "Planta", cargo: "Analista", remuneracion_bruta_mensual: 100, fuente_periodo: "2026-02" },
      { nombre_completo: "Ana Pérez", organo_nombre: "Municipalidad A", tipo_contrato: "Planta", cargo: "Analista", remuneracion_bruta_mensual: 125, fuente_periodo: "8768-03" },
      { nombre_completo: "Ana Pérez", organo_nombre: "Municipalidad A", tipo_contrato: "Planta", cargo: "Analista", remuneracion_bruta_mensual: 150, fuente_periodo: "2027-01" },
    ], [], "2026-03-01T00:00:00.000Z");

    expect(summary.latestPeriod).toBe("2026-02");
    expect(summary.quality.invalidPeriodCount).toBe(2);
    expect(summary.periods).toHaveLength(1);
  });

  it("mantiene el fallback de Pages agregado sin inventar comparaciones individuales", () => {
    const stats = {
      recordCount: 2,
      periods: new Map([
        ["2026-01", { rows: 1, organisms: new Set(["municipalidad a"]), withAmount: 1, withoutAmount: 0, grossTotal: 100, contracts: { Planta: 1 } }],
        ["2026-02", { rows: 1, organisms: new Set(["municipalidad a"]), withAmount: 0, withoutAmount: 1, grossTotal: 0, contracts: { Planta: 1 } }],
      ]),
      contractCounts: { Planta: 2 },
      issueCounts: {},
      recordsWithIssues: 0,
      invalidPeriodCount: 0,
      positiveAmountCount: 1,
      zeroAmountCount: 0,
      missingAmountCount: 1,
    };

    const summary = buildCpltAggregateSummary(stats, [], "2026-02-01T00:00:00.000Z");

    expect(summary.comparisonsAvailable).toBe(false);
    expect(summary.periods.at(-1)).toEqual(expect.objectContaining({
      rows: 1,
      people: null,
      grossTotal: 0,
      newRecords: null,
      removedRecords: null,
      amountChanges: null,
    }));
    expect(summary.quality.amountStates).toEqual({ positive: 1, zero: 0, notPublished: 1 });
  });

  it("acepta filas compactas del índice sin perder altas, bajas ni cambios", () => {
    const summary = buildCpltTransparencySummary([
      { n: "Ana Pérez", o: "Municipalidad A", t: "Planta", c: "Analista", b: 100, p: "2026-01", q: [] },
      { n: "Ana Pérez", o: "Municipalidad A", t: "Planta", c: "Analista", b: 125, p: "2026-02", q: [] },
      { n: "Bruno Soto", o: "Municipalidad A", t: "Contrata", c: "Técnico", b: null, p: "2026-02", q: ["remuneracion_liquida_no_informada"] },
    ], [], "2026-02-01T00:00:00.000Z");

    expect(summary.periods.at(-1)).toEqual(expect.objectContaining({ newRecords: 1, removedRecords: 0, amountChanges: 1, amountDelta: 25 }));
    expect(summary.quality.amountStates).toEqual({ positive: 2, zero: 0, notPublished: 1 });
    expect(summary.quality.recordsWithIssues).toBe(1);
  });

  it("marca como parcial un corte con una caída abrupta de cobertura", () => {
    const previous = Array.from({ length: 1_000 }, (_, index) => ({
      nombre_completo: `Persona ${index}`,
      organo_nombre: `Organismo ${index % 50}`,
      tipo_contrato: "Planta",
      cargo: "Analista",
      remuneracion_bruta_mensual: 100,
      fuente_periodo: "2026-07",
    }));
    const summary = buildCpltTransparencySummary([
      ...previous,
      { nombre_completo: "Persona nueva", organo_nombre: "Organismo 1", tipo_contrato: "Planta", cargo: "Analista", remuneracion_bruta_mensual: 100, fuente_periodo: "2026-08" },
    ], [], "2026-08-21T00:00:00.000Z");

    expect(summary.periods.at(-1)).toMatchObject({ period: "2026-08", status: "parcial" });
    expect(summary.latestPeriodStatus).toBe("parcial");
  });

  it("marca como parcial un corte con un aumento abrupto de cobertura", () => {
    const previous = Array.from({ length: 1_000 }, (_, index) => ({
      nombre_completo: `Persona ${index}`,
      organo_nombre: `Organismo ${index % 50}`,
      tipo_contrato: "Planta",
      cargo: "Analista",
      remuneracion_bruta_mensual: 100,
      fuente_periodo: "2026-06",
    }));
    const current = Array.from({ length: 3_001 }, (_, index) => ({
      nombre_completo: `Persona actual ${index}`,
      organo_nombre: `Organismo actual ${index % 150}`,
      tipo_contrato: "Planta",
      cargo: "Analista",
      remuneracion_bruta_mensual: 100,
      fuente_periodo: "2026-07",
    }));
    const summary = buildCpltTransparencySummary([...previous, ...current], [], "2026-07-31T00:00:00.000Z");

    expect(summary.periods.at(-1)).toMatchObject({
      period: "2026-07",
      status: "parcial",
      statusReason: "El aumento abrupto de filas u organismos indica un cambio de alcance o una publicación excepcional; requiere confirmación en la fuente oficial.",
    });
    expect(summary.latestPeriodStatus).toBe("parcial");
  });

  it("reclasifica resúmenes precalculados sin perder sus comparaciones", () => {
    const summary = reclassifyCpltSummary({
      dataset: "transparencia-activa-funcionarios-summary",
      recordCount: 1_257_733,
      periods: [
        { period: "2026-06", rows: 75_136, organisms: 346, status: "comparable", newRecords: 65_164 },
        { period: "2026-07", rows: 257_733, organisms: 346, status: "comparable", newRecords: 236_195 },
      ],
      latestPeriod: "2026-07",
      latestPeriodStatus: "comparable",
    });

    expect(summary.periods[0]).toMatchObject({ status: "linea_base", newRecords: 65_164 });
    expect(summary.periods[1]).toMatchObject({
      status: "parcial",
      statusReason: "El aumento abrupto de filas u organismos indica un cambio de alcance o una publicación excepcional; requiere confirmación en la fuente oficial.",
      newRecords: 236_195,
    });
    expect(summary.latestPeriodStatus).toBe("parcial");
  });
});
