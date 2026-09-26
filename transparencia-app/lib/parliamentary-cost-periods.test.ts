import { describe, expect, it } from "vitest";
import {
  buildParliamentCostPeriods,
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
      { periodo: "2014-03", sueldo: null, gastos: 120, personal: null },
      { periodo: "2026-06", sueldo: 8_000, gastos: null, personal: null },
      { periodo: "2026-07", sueldo: null, gastos: 0, personal: 350 },
    ]);
  });

  it("does not invent fallback months when all sources lack a published period", () => {
    expect(buildParliamentCostPeriods({
      expenseMonths: [],
      staffAmountsByPeriod: new Map(),
      salaryPeriod: null,
      salaryAmount: null,
    })).toEqual([]);
  });

  it("opens the consolidated panel in the latest period with an official salary", () => {
    const months = buildParliamentCostPeriods({
      expenseMonths: [
        { periodo: "2026-06", total: 100 },
        { periodo: "2026-07", total: 120 },
      ],
      staffAmountsByPeriod: new Map([
        ["2026-06", 200],
        ["2026-07", 220],
      ]),
      salaryPeriod: "2026-06",
      salaryAmount: 8_239_091,
    });

    expect(selectDefaultParliamentCostPeriod(months, "2026-06")).toBe("2026-06");
  });

  it("falls back to the latest published component period when salary is unavailable", () => {
    const months = buildParliamentCostPeriods({
      expenseMonths: [{ periodo: "2026-07", total: 120 }],
      staffAmountsByPeriod: new Map(),
      salaryPeriod: null,
      salaryAmount: null,
    });

    expect(selectDefaultParliamentCostPeriod(months, null)).toBe("2026-07");
  });
});
