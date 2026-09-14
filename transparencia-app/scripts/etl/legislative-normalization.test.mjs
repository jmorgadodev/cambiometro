import { describe, expect, it } from "vitest";
import {
  legislativeChamber,
  normalizeLegislativePeriod,
  normalizeLegislativeRecord,
  normalizeLegislativeRelease,
  validateLegislativeRelease,
} from "../legislative-normalization.mjs";

describe("normalización separada de Cámara y Senado", () => {
  it("asigna votaciones por fuente y conserva el original", () => {
    const original = {
      id: "camara-vote-1",
      descripcion: "Proyecto de ley",
      fecha: "2026-08-01",
      votos: [],
      url: "https://opendata.camara.cl/vote/1",
    };
    const normalized = normalizeLegislativeRecord("votaciones_camara", original, { sourceLabel: "Cámara" });
    expect(normalized.chamber).toBe("camara");
    expect(normalized.category).toBe("votaciones");
    expect(normalized.original).toBe(original);
  });

  it("mantiene personal de apoyo separado de gastos y asesorías", () => {
    const support = normalizeLegislativeRecord("personal-apoyo", {
      id: "support-1",
      nombre: "Ana Pérez",
      periodo: "2026-07",
      monto_clp: 1_000_000,
      url: "https://www.camara.cl/diputados/detalle/personal.aspx",
    });
    const expense = normalizeLegislativeRecord("gastos_camara", {
      id: "expense-1",
      nombre: "Ana Pérez",
      periodo: "2026-07",
      item: "TRASLACIÓN",
      monto_clp: 200_000,
      url: "https://www.camara.cl/diputados/detalle/gastos.aspx",
    });
    expect(support.category).toBe("personal_apoyo");
    expect(expense.category).toBe("gastos_operacionales");
    expect(support.category).not.toBe(expense.category);
  });

  it("usa sueldo y metadatos del release cuando la fila no repite monto ni URL", () => {
    const normalized = normalizeLegislativeRecord("personal-apoyo", {
      nombre: "Ana Pérez",
      cargo: "Asesora",
      sueldo: 1200000,
    }, {
      recordId: "support-1",
      defaultPeriod: "2026-07",
      defaultOfficialUrls: ["https://www.camara.cl/transparencia"],
    });
    expect(normalized.montoClp).toBe(1200000);
    expect(normalized.periodo).toBe("2026-07");
    expect(normalized.officialUrls).toHaveLength(1);
    expect(normalized.qualityObservations).not.toContain("monto_ausente");
    expect(normalized.qualityObservations).not.toContain("periodo_ausente");
  });

  it("identifica asesoría sólo cuando la fila lo declara", () => {
    const normalized = normalizeLegislativeRecord("gastos_senado", {
      id: "senado-advice-1",
      periodo: "2026-05",
      item: "Asesoría externa legislativa",
      monto_clp: "1.200.000",
      url: "https://www.senado.cl/transparencia",
    });
    expect(normalized.category).toBe("asesorias");
    expect(normalized.montoClp).toBe(1200000);
  });

  it("rechaza ids duplicados dentro del mismo release", () => {
    const release = normalizeLegislativeRelease({
      sourceId: "votaciones_senado",
      rows: [{ id: "vote-1", fecha: "2026-01-01" }, { id: "vote-1", fecha: "2026-01-02" }],
    });
    expect(() => validateLegislativeRelease(release)).toThrow("LEGISLATIVE_DUPLICATE_ID");
  });

  it("admite un identificador técnico externo cuando la fuente no publica id", () => {
    const release = normalizeLegislativeRelease({
      sourceId: "personal-apoyo",
      rows: [{ nombre: "Ana Pérez", cargo: "Asesora" }],
      recordIdForRow: (_row, index) => `support-${index}`,
    });
    expect(validateLegislativeRelease(release).records[0]).toMatchObject({ recordId: "support-0" });
    expect(release.records[0].original).not.toHaveProperty("id");
  });

  it("no inventa una cámara para una fuente desconocida", () => {
    expect(legislativeChamber("otra-fuente")).toBeNull();
  });

  it("convierte períodos escritos en español a YYYY-MM", () => {
    expect(normalizeLegislativePeriod("julio 2026")).toBe("2026-07");
    expect(normalizeLegislativePeriod("2026-08-15")).toBe("2026-08");
  });
});
