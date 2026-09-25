import { describe, expect, it } from "vitest";
import { daysSinceCalendarDate, getChileDateKey, latestEffectiveMovementDate, latestMovementReviewDate, latestMovementSignalDate } from "./movement-age";

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

  it("lee el registro efectivo más reciente desde la respuesta paginada de la API", () => {
    expect(latestEffectiveMovementDate({
      data: [
        { data: { fecha: "2026-09-23", estado: "verificado_oficial" } },
        { data: { fecha: "2026-09-22", estado: "corroborado" } },
      ],
      meta: { sourceBackend: "r2", sourceStatus: "complete" },
    })).toBe("2026-09-23");
  });

  it("usa la detección más reciente como fecha de revisión, sin confundirla con la fecha del evento", () => {
    expect(latestMovementReviewDate("2026-09-15T00:00:00.000Z", [
      { date: "2026-09-17", detected_at: "2026-09-23T13:24:23.238Z" },
      { date: "2026-09-15", detected_at: "2026-09-23T13:24:23.238Z" },
    ])).toBe("2026-09-23");
  });

  it("ignora marcas de detección inválidas y conserva el último corte revisado válido", () => {
    expect(latestMovementReviewDate("2026-09-15T00:00:00.000Z", [
      { date: "2026-09-17", detected_at: "no-es-fecha" },
    ])).toBe("2026-09-15");
  });

  it("obtiene la señal publicada más reciente sin convertirla en un cambio efectivo", () => {
    expect(latestMovementSignalDate([
      { date: "2026-09-15", status: "en_confirmacion" },
      { date: "2026-09-17", status: "en_confirmacion" },
    ])).toBe("2026-09-17");
  });
});
