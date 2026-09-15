import { describe, expect, it } from "vitest";
import { paidRemunerationFingerprint, paidRemunerationShape } from "../scripts/etl/paid-remunerations-reconcile.mjs";

describe("conciliación de remuneraciones pagadas", () => {
  const base = {
    organo_nombre: "Servicio Público Ñuble",
    fuente_periodo: "2026-07",
    nombre_completo: "María Álvarez",
    cargo: "Asesora",
    remuneracion_bruta_mensual: 1_200_000,
    remuneracion_liquida_mensual: 950_000,
  };

  it("ignora mayúsculas y tildes al generar la huella", () => {
    expect(paidRemunerationFingerprint(base)).toBe(paidRemunerationFingerprint({
      ...base,
      organo_nombre: "SERVICIO PUBLICO NUBLE",
      nombre_completo: "MARIA ALVAREZ",
    }));
  });

  it("mantiene diferencias de monto como conflicto, no como duplicado exacto", () => {
    expect(paidRemunerationFingerprint(base)).not.toBe(paidRemunerationFingerprint({ ...base, remuneracion_bruta_mensual: 1_300_000 }));
    expect(paidRemunerationShape(base)).toBe(paidRemunerationShape({ ...base, remuneracion_bruta_mensual: 1_300_000 }));
  });

  it("no fusiona personas de organismos distintos sólo por compartir nombre", () => {
    expect(paidRemunerationShape(base)).not.toBe(paidRemunerationShape({ ...base, organo_nombre: "Ministerio de Salud" }));
  });
});
