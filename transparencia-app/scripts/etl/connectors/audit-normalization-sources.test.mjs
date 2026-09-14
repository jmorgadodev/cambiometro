import { describe, expect, it } from "vitest";
import { buildNormalizationSourceAudit } from "../../audit-normalization-sources.mjs";

describe("auditor de contrato de normalización por fuente", () => {
  it("asigna el contrato común sólo a fuentes personales", () => {
    const [personal, compras] = buildNormalizationSourceAudit({
      qualitySources: [
        { id: "transparencia-activa", label: "Transparencia Activa", scope: "personal", derived: false, canonicalCount: 10, historicalCount: 20, queryableCount: 10 },
        { id: "chilecompra", label: "ChileCompra", scope: "compras", derived: false, canonicalCount: 5, historicalCount: 5, queryableCount: 5 },
      ],
      sourceHealth: { cplt: { recordCount: 10, status: "complete", generatedAt: "2026-09-14T00:00:00.000Z" } },
      now: new Date("2026-09-14T12:00:00.000Z"),
    });

    expect(personal.normalizationContract).toBe("funcionarios-v1");
    expect(personal.flags).toContain("personal_normalization_required");
    expect(compras.normalizationContract).toBe("domain-specific-pending");
  });

  it("marca diferencias de conteo y metadatos antiguos sin corregirlos", () => {
    const [source] = buildNormalizationSourceAudit({
      qualitySources: [{ id: "camara", label: "Cámara", scope: "parlamento", derived: false, canonicalCount: 12, historicalCount: 10, queryableCount: 8 }],
      sourceHealth: { camara: { recordCount: 8, status: "partial", generatedAt: "2026-07-01T00:00:00.000Z" } },
      now: new Date("2026-09-14T00:00:00.000Z"),
    });

    expect(source.canonicalCount).toBe(12);
    expect(source.flags).toEqual([
      "canonical_differs_from_queryable",
      "canonical_may_exceed_historical",
      "metadata_older_than_30_days",
      "source_partial",
    ]);
  });
});
