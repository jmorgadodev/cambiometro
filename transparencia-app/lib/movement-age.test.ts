import { describe, expect, it } from "vitest";
import { daysSinceCalendarDate, getChileDateKey, latestEffectiveMovementDate } from "./movement-age";

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

  it("usa el movimiento efectivo más reciente y excluye señales pendientes", () => {
    expect(latestEffectiveMovementDate([
      { fecha: "2026-09-14", estado: "corroborado" },
      { fecha: "2026-09-15", estado: "en_confirmacion" },
      { fecha: "2026-09-12", estado: "verificado_oficial" },
    ])).toBe("2026-09-14");
  });

  it("ignora fechas malformadas y estados no publicados", () => {
    expect(latestEffectiveMovementDate([
      { fecha: "2026-99-42", estado: "verificado" },
      { fecha: "2026-09-20", estado: "detectado" },
      { fecha: "2026-09-21", estado: "en_confirmacion" },
    ])).toBeNull();
  });
});
