import { describe, expect, it } from "vitest";
import { daysSinceCalendarDate, getChileDateKey } from "./movement-age";

describe("contador de días desde el último movimiento", () => {
  it("cuenta días calendario desde el cambio efectivo, no desde la última revisión", () => {
    expect(daysSinceCalendarDate("2026-09-14", "2026-09-23")).toBe(9);
  });

  it("marca cero el mismo día del último cambio", () => {
    expect(daysSinceCalendarDate("2026-09-14", "2026-09-14")).toBe(0);
  });

  it("calcula el día actual usando la zona horaria de Chile", () => {
    expect(getChileDateKey(new Date("2026-09-15T02:30:00.000Z"))).toBe("2026-09-14");
  });
});
