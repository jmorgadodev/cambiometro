import { describe, expect, it } from "vitest";
import { projectLakeEvidence } from "@/lib/r2-records";

describe("registros calientes de R2", () => {
  it("proyecta ejecución DIPRES con monto CLP, origen y checksum", () => {
    const record = projectLakeEvidence({ id: "dipres-1", sourceId: "dipres", kind: "budget_execution", occurredAt: "2026-06-01", evidence: { sourceUrl: "https://dipres.gob.cl/real.csv" }, data: { period: "2026-06", denominacion: "APORTE FISCAL", ejecucion_acumulada_clp: 12_809_860_000, monto_original: { ejecutado: "12.809.860", unidad: "miles de pesos" } } }, "abc", "2026-08-08T00:00:00Z");
    expect(record).toMatchObject({ kind: "budget_execution", title: "APORTE FISCAL", amount: { amountClp: 12_809_860_000, currency: "CLP", originalAmount: "12.809.860", originalUnit: "miles de pesos" }, evidence: { checksumSha256: "abc" } });
  });

  it("proyecta contratos ChileCompra con comprador, proveedores y moneda original", () => {
    const record = projectLakeEvidence({ id: "chilecompra-award-1", sourceId: "chilecompra", kind: "contract", occurredAt: "2026-06-01", evidence: { sourceUrl: "https://api.mercadopublico.cl/real" }, data: { title: "Orden de compra", description: "Servicio", buyer: { id: "CL-MP-10" }, suppliers: [{ id: "CL-MP-20" }], monto_clp: 593301, monto_original: { amount: "593301", currency: "CLP", unit: "currency_unit" } } }, "def", "2026-08-08T00:00:00Z");
    expect(record).toMatchObject({ kind: "contract", title: "Orden de compra", subjectEntityIds: ["chilecompra-cl-mp-10"], objectEntityIds: ["chilecompra-cl-mp-20"], amount: { amountClp: 593301, originalAmount: "593301" } });
  });

  it("conserva entidades territoriales explícitas de SINIM", () => {
    const record = projectLakeEvidence({ id: "sinim-1", sourceId: "sinim", kind: "expense", occurredAt: "2025-12-31", evidence: { sourceUrl: "https://datos.sinim.gov.cl/real.xls" }, data: { title: "Gasto municipal", subject_entity_ids: ["municipality-cl-01101"], monto_clp: 10_000, monto_original: { amount: "10", currency: "CLP", unit: "miles de pesos" } } }, "abc", "2026-08-08T00:00:00Z");
    expect(record).toMatchObject({ subjectEntityIds: ["municipality-cl-01101"], amount: { amountClp: 10_000 } });
  });
});
