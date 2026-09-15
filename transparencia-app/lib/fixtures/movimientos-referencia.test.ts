import { describe, it, expect } from "vitest";
import { MOVIMIENTOS } from "@/lib/movimientos";

/**
 * Corte público de referencia: salidas hasta el 14-09-2026.
 *
 * Este fixture reemplaza la prueba histórica que validaba nombres y enlaces
 * BCN heredados. Esos enlaces no eran confiables y podían apuntar a normas de
 * otros años u organismos. La prueba actual valida alcance, categorías,
 * evidencia visible y ausencia de la mezcla detectada.
 */
describe("Release de referencia de Movimientos 2026", () => {
  it("contiene exactamente 46 salidas en el alcance presentado", () => {
    expect(MOVIMIENTOS).toHaveLength(46);
    expect(MOVIMIENTOS.every((movement) => movement.fecha <= "2026-09-14")).toBe(true);
  });

  it("respeta la distribución 3 ministras, 6 subsecretarías, 36 seremis y 1 delegado", () => {
    const counts = { ministers: 0, subsecretaries: 0, seremis: 0, delegados: 0 };
    for (const movement of MOVIMIENTOS) {
      if (/^Ministr[oa]\b/u.test(movement.cargo)) counts.ministers += 1;
      else if (/^Subsecretari[oa]\b/u.test(movement.cargo)) counts.subsecretaries += 1;
      else if (/^Seremi\b/u.test(movement.cargo)) counts.seremis += 1;
      else if (/^Delegad[oa] Presidencial Provincial\b/u.test(movement.cargo)) counts.delegados += 1;
    }
    expect(counts).toEqual({ ministers: 3, subsecretaries: 6, seremis: 36, delegados: 1 });
  });

  it("mantiene a Rafael Araos como subsecretario", () => {
    const araos = MOVIMIENTOS.find((movement) => movement.saliente === "Rafael Araos");
    expect(araos?.cargo).toMatch(/^Subsecretario/u);
  });

  it("no reincorpora las autoridades excluidas por mezcla de administraciones", () => {
    const excluded = [
      "Carolina Arredondo",
      "Eduardo Vergara",
      "Ignacia Fernández",
      "Daniela Dresdner",
      "José Andrés Herrera",
      "Patricio Kuhn",
    ];
    for (const name of excluded) {
      expect(MOVIMIENTOS.some((movement) => String(movement.saliente ?? "").includes(name))).toBe(false);
    }
  });

  it("no publica el agregador externo y conserva fuentes públicas visibles", () => {
    expect(MOVIMIENTOS.every((movement) => movement.fuentes.every((source) => !/renunciaskast/i.test(`${source.url} ${source.medio}`)))).toBe(true);
    expect(MOVIMIENTOS.every((movement) => movement.fuentes.some((source) => source.nivel === "prensa" || source.nivel === "oficial"))).toBe(true);
    expect(MOVIMIENTOS.some((movement) => movement.estado === "verificado")).toBe(true);
    expect(MOVIMIENTOS.some((movement) => movement.estado === "corroborado")).toBe(true);
  });

  it("muestra los reemplazos auditados y distingue cuando no fueron informados", () => {
    const replacements = new Map(MOVIMIENTOS.map((movement) => [movement.saliente, movement.entrante]));
    expect(replacements.get("Natalia Duco")).toBe("Francisco Riveros Cantuarias");
    expect(replacements.get("Andrés Otero")).toBe("Sofía Rengifo Ottone");
    expect(replacements.get("Mara Sedini")).toContain("Claudio Alvarado");
    expect(MOVIMIENTOS.some((movement) => movement.reemplazo_estado === "no_informado_en_fuentes_consultadas")).toBe(true);
  });
});
