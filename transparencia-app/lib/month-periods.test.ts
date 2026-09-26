import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PeriodYearMonthFilter from "@/components/PeriodYearMonthFilter";
import { availablePeriodYears, formatPublishedMonth, latestPublishedPeriod, parseSpanishMonthPeriod, periodsForYear } from "./month-periods";

describe("monthly published-period selectors", () => {
  const periods = ["2025-12", "2026-03", "2026-07", "2026-03", "bad", "2026-13", "2014-02"];

  it("returns only valid, unique periods in reverse chronological order", () => {
    expect(latestPublishedPeriod(periods)).toBe("2026-07");
  });

  it("lists only years that contain published periods, newest first", () => {
    expect(availablePeriodYears(periods)).toEqual(["2026", "2025", "2014"]);
  });

  it("keeps month options within the selected year and newest first", () => {
    expect(periodsForYear(periods, "2026")).toEqual(["2026-07", "2026-03"]);
  });

  it("does not invent a latest period when a source has no valid months", () => {
    expect(latestPublishedPeriod(["", "2026-00", "2026-13"])).toBe("");
  });

  it("parses only explicit Spanish month-year labels", () => {
    expect(parseSpanishMonthPeriod("julio 2026")).toBe("2026-07");
    expect(parseSpanishMonthPeriod("Septiembre 2025")).toBe("2025-09");
    expect(parseSpanishMonthPeriod("julio")).toBe("");
  });

  it("formats periods in Spanish without changing their source value", () => {
    expect(formatPublishedMonth("2026-07")).toBe("Julio 2026");
  });

  it("renders separate accessible year and month selectors for the latest actual cut", () => {
    const html = renderToStaticMarkup(createElement(PeriodYearMonthFilter, {
      periods: ["2025-12", "2026-03", "2026-07"],
      selectedPeriod: "2026-07",
      onChange: () => undefined,
      label: "Filtrar gastos operacionales rendidos",
    }));

    expect(html).toContain('aria-label="Filtrar gastos operacionales rendidos: año"');
    expect(html).toContain('aria-label="Filtrar gastos operacionales rendidos: mes publicado"');
    expect(html).toContain("Julio 2026");
    expect(html).not.toContain("Diciembre 2025");
  });
});
