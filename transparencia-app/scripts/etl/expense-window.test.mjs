import { describe, expect, it } from "vitest";
import { expenseMonthWindow } from "./expense-window.mjs";

describe("expenseMonthWindow", () => {
  it("limits a normal monthly refresh to the release and one overlap month", () => {
    expect(expenseMonthWindow(8)).toEqual({ firstMonth: 7, lastMonth: 8 });
  });

  it("supports an explicit full-history backfill", () => {
    expect(expenseMonthWindow(8, { fullHistory: true })).toEqual({ firstMonth: 1, lastMonth: 8 });
  });
});

