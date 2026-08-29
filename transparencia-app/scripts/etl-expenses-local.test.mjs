import { describe, expect, it } from "vitest";
import { chileExpenseSchedule, mergeExpenseRecords } from "./etl-expenses-local.mjs";

describe("runner local de gastos operacionales", () => {
  it("ejecuta el día 2 usando la zona horaria de Chile", () => {
    const schedule = chileExpenseSchedule(new Date("2026-08-02T03:30:00.000Z"));
    expect(schedule.date).toBe("2026-08-01");
    expect(schedule.shouldRun).toBe(false);

    const second = chileExpenseSchedule(new Date("2026-08-02T04:30:00.000Z"));
    expect(second.date).toBe("2026-08-02");
    expect(second.shouldRun).toBe(true);
  });

  it("fusiona por ID sin duplicar ni reducir el snapshot anterior", () => {
    const merged = mergeExpenseRecords(
      [{ id: "a", monto_clp: 100 }, { id: "b", monto_clp: 200 }],
      [{ id: "b", monto_clp: 250 }, { id: "c", monto_clp: 300 }],
    );
    expect(merged).toEqual([
      { id: "a", monto_clp: 100 },
      { id: "b", monto_clp: 250 },
      { id: "c", monto_clp: 300 },
    ]);
  });
});
