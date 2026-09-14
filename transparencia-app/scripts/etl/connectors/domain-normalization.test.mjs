import { describe, expect, it } from "vitest";
import { normalizeMovementRecord, normalizeParliamentaryRecord, normalizeDomainRecords, summarizeDomainRecords } from "./domain-normalization.mjs";

describe("contrato normalizado por dominio", () => {
  it("separa categorías parlamentarias y conserva cero, nulo y original", () => {
    const original = { id: "g-1", fecha: "2026-08-01", monto_clp: 0, category: "Traslado" };
    const normalized = normalizeParliamentaryRecord({ sourceId: "camara", sourceKey: "gastos_camara", raw: original });

    expect(normalized).toMatchObject({
      sourceId: "camara",
      sourceKey: "gastos_camara",
      recordId: "g-1",
      category: "gastos",
      period: "2026-08",
      amountClp: 0,
      amountState: "reported",
    });
    expect(normalized.original).toBe(original);
    expect(normalized.qualityIssues).toEqual([]);

    const missing = normalizeParliamentaryRecord({ sourceId: "senado", sourceKey: "gastos_senado", raw: { id: "g-2", monto_clp: null } });
    expect(missing.amountClp).toBeNull();
    expect(missing.amountState).toBe("not_reported");
  });

  it("no fusiona movimientos y deja explícita la falta de evidencia o identificador", () => {
    const original = {
      id: "mov-1",
      fecha: "2026-09-01",
      cargo: "Director",
      organismo: "Servicio",
      entrante: "Persona A",
      saliente: "Persona B",
      estado: "verificado",
      fuentes: [{ nivel: "oficial", medio: "Ley Chile", url: "https://example.test/1", fecha: "2026-09-01" }],
    };
    const normalized = normalizeMovementRecord(original);
    expect(normalized).toMatchObject({
      recordId: "mov-1",
      eventDate: "2026-09-01",
      role: "Director",
      organization: "Servicio",
      entrantName: "Persona A",
      outgoingName: "Persona B",
      verificationState: "verificado",
    });
    expect(normalized.documentarySources).toHaveLength(1);
    expect(normalized.original).toBe(original);

    const incomplete = normalizeMovementRecord({ fecha: "2026-09-02", entrante: "Persona C" });
    expect(incomplete.qualityIssues).toEqual([
      "missing_stable_record_id",
      "missing_documentary_source",
    ]);
  });

  it("resume un lote sin duplicar ni reemplazar sus filas originales", () => {
    const original = { id: "v-1", fecha: "2026-08-01", kind: "vote", monto_clp: null, url: "https://example.test/v-1" };
    const normalized = normalizeDomainRecords({
      domain: "parlamentario",
      sourceId: "camara",
      sourceKey: "votaciones_camara",
      records: [original],
    });
    const summary = summarizeDomainRecords({
      domain: "parlamentario",
      sourceId: "camara",
      sourceKey: "votaciones_camara",
      records: [original],
    });

    expect(normalized.records[0].original).toBe(original);
    expect(normalized.categories).toEqual({ votaciones: 1 });
    expect(summary).not.toHaveProperty("records");
    expect(summary.recordCount).toBe(1);
  });
});
