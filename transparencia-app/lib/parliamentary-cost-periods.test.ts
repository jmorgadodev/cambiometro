import { describe, expect, it } from "vitest";
import {
  buildParliamentCostPeriods,
  externalAdvisoryAmountsByPeriod,
  selectDefaultParliamentCostPeriod,
} from "./parliamentary-cost-periods";

describe("parliamentary monthly cost periods", () => {
  it("uses only source-published periods and keeps every component in its own cut", () => {
    const result = buildParliamentCostPeriods({
      expenseMonths: [
        { periodo: "2014-03", total: 120 },
        { periodo: "2026-07", total: 0 },
      ],
      staffAmountsByPeriod: new Map([["2026-07", 350]]),
      salaryPeriod: "2026-06",
      salaryAmount: 8_000,
    });

    expect(result).toEqual([
      { periodo: "2014-03", sueldo: null, gastos: 120, personal: null, asesorias: null },
      { periodo: "2026-06", sueldo: 8_000, gastos: null, personal: null, asesorias: null },
      { periodo: "2026-07", sueldo: null, gastos: 0, personal: 350, asesorias: null },
    ]);
  });

  it("sums Cámara external advisories as a separate published monthly component", () => {
    const advisoryAmountsByPeriod = externalAdvisoryAmountsByPeriod([{
      period: "marzo 2026",
      rows: [
        { values: { Monto: "397.823" } },
        { values: { Monto: "650.000" } },
      ],
    }]);
    const result = buildParliamentCostPeriods({
      expenseMonths: [{ periodo: "2026-03", total: 200 }],
      staffAmountsByPeriod: new Map([["2026-03", 300]]),
      advisoryAmountsByPeriod,
      salaryPeriod: "2026-03",
      salaryAmount: 8_000_000,
    });

    expect(result).toEqual([{
      periodo: "2026-03",
      sueldo: 8_000_000,
      gastos: 200,
      personal: 300,
      asesorias: 1_047_823,
    }]);
  });

  it("does not turn missing advisory amounts or empty months into zero", () => {
    expect(externalAdvisoryAmountsByPeriod([
      { period: "mayo 2026", rows: [] },
      { period: "junio 2026", rows: [{ values: { Monto: "" } }] },
      { period: "julio 2026", rows: [{ values: { Monto: "650.000" } }] },
    ])).toEqual(new Map([["2026-07", 650_000]]));
  });

  it("does not invent fallback months when all sources lack a published period", () => {
    expect(buildParliamentCostPeriods({
      expenseMonths: [],
      staffAmountsByPeriod: new Map(),
      advisoryAmountsByPeriod: new Map(),
      salaryPeriod: null,
      salaryAmount: null,
    })).toEqual([]);
  });

  it("opens the latest published component period even if salary is from an earlier month", () => {
    const months = buildParliamentCostPeriods({
      expenseMonths: [
        { periodo: "2026-06", total: 100 },
        { periodo: "2026-07", total: 120 },
      ],
      staffAmountsByPeriod: new Map([
        ["2026-06", 200],
        ["2026-07", 220],
      ]),
      advisoryAmountsByPeriod: new Map(),
      salaryPeriod: "2026-06",
      salaryAmount: 8_239_091,
    });

    expect(selectDefaultParliamentCostPeriod(months)).toBe("2026-07");
  });

  it("falls back to the latest published component period when salary is unavailable", () => {
    const months = buildParliamentCostPeriods({
      expenseMonths: [{ periodo: "2026-07", total: 120 }],
      staffAmountsByPeriod: new Map(),
      advisoryAmountsByPeriod: new Map(),
      salaryPeriod: null,
      salaryAmount: null,
    });

    expect(selectDefaultParliamentCostPeriod(months)).toBe("2026-07");
  });
});
