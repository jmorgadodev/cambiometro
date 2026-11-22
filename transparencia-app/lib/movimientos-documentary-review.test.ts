import { MOVIMIENTOS } from "./movimientos";
import { buildMovementRegister } from "./movement-register-source";
import { describe, expect, it } from "vitest";
import { movementDocumentaryReview } from "./movimientos-documentary-review";

const cases = [
  ["evelyn-bintrup", "2026-08-11"],
  ["jorge-heiden", "2026-06-25"],
  ["camila-alonso", "2026-05-06"],
  ["patricia-dinamarca", "2026-04-01"],
  ["jorge-salazar", "2026-03-28"],
  ["alexander-nanjari", "2026-03-26"],
] as const;

describe("revisión documental de las seis fechas cuestionadas", () => {
  it.each(cases)("retira la fecha no acreditada de %s sin alterar el registro", (name, date) => {
    const movement = Object.freeze({ id: `mov-kast-2026-${date}-${name}`, fecha: date });
    const review = movementDocumentaryReview(movement);
    expect(review?.dateInReview).toBe(true);
    expect(review?.note).toBeTruthy();
    expect(review?.sourceUrl).toMatch(/^https:\/\//);
    expect(movement.fecha).toBe(date);
  });
  it("no atribuye la nota a otro ID o a un corte cuya fecha cambió", () => {
    expect(movementDocumentaryReview({ id: "otra-persona", fecha: "2026-05-06" })).toBeNull();
    expect(movementDocumentaryReview({ id: "mov-kast-2026-2026-05-06-camila-alonso", fecha: "2026-05-04" })).toBeNull();
  });
  it("distingue explícitamente salida, asunción y fecha de publicación", () => {
    const review = movementDocumentaryReview({ id: "mov-kast-2026-2026-05-06-camila-alonso", fecha: "2026-05-06" });
    expect(review?.note).toContain("4 de mayo");
    expect(review?.note).toContain("5 de junio");
    expect(review?.note).toContain("20 de agosto");
  });
  it("comparte la revisión de fecha entre las vistas sin inventar una asunción", () => {
    const movement = MOVIMIENTOS.find(m => m.id.includes("camila-alonso"))!;
    const [entry] = buildMovementRegister([movement], []);
    expect(entry.review).toContain("4 de mayo");
    expect(entry.effectiveDate).toBeNull();
    expect(entry.incomingDate).toBeNull();
    expect(entry.otherName).toBe(movement.entro?.nombre);
    expect(entry.originalDate).toBe(movement.fecha);
  });
});
