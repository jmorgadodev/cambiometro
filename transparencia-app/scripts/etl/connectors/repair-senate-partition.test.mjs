import { describe, expect, it } from "vitest";
import { buildRepairPlan } from "../repair-senate-partition.mjs";

function record(id, fecha) {
  return {
    id: `senado-domestic-ticket-${id}`,
    fecha,
    period: fecha.slice(0, 7),
    kind: "expense",
    title: "Pasaje aéreo nacional",
    person: { entity_id: `senator-cl-ue-${id}`, official_id: String(id), name: "Senador de Prueba", role: "Senador/a" },
    subject_entity_ids: [`senator-cl-ue-${id}`],
    object_entity_ids: [],
    monto_clp: null,
    monto_original: null,
    availability: "not_reported",
    url: "https://www.senado.cl/transparencia/viajes-nacionales",
    fuente: "Senado de la República · Transparencia activa",
  };
}

describe("repair-senate-partition", () => {
  it("reconstruye sólo la partición declarada con el mismo número de filas", () => {
    const result = {
      sourceId: "senado",
      dataset: "domestic_tickets",
      year: 2025,
      month: 8,
      records: [record(1, "2025-08-01"), record(2, "2025-08-02")],
    };
    const existingCatalog = {
      generatedAt: "2026-09-13T00:00:00.000Z",
      sources: [{ id: "senado", entityKey: "entities/v1/senado-existing.jsonl.gz", entityIndexKey: "indexes/v1/senado-existing.jsonl.gz", entityCount: 50 }],
      partitions: [
        { id: "senado/2025/08", sourceId: "senado", period: "2025-08", sourcePeriod: null, recordCount: 2, checksumSha256: "old" },
        { id: "senado/2026/07", sourceId: "senado", period: "2026-07", sourcePeriod: null, recordCount: 50, checksumSha256: "keep" },
      ],
    };
    const plan = buildRepairPlan({ result, existingCatalog, generatedAt: "2026-09-13T19:00:00.000Z" });
    expect(plan.catalog.partitions).toHaveLength(2);
    expect(plan.catalog.partitions.find((item) => item.id === "senado/2025/08").recordCount).toBe(2);
    expect(plan.catalog.partitions.find((item) => item.id === "senado/2026/07").checksumSha256).toBe("keep");
    expect(plan.catalog.sources.find((item) => item.id === "senado").entityKey).toBe("entities/v1/senado-existing.jsonl.gz");
    expect(plan.assets.some((item) => item.key.startsWith("entities/v1/senado-"))).toBe(false);
    expect(plan.assets.some((item) => item.key === "partitions/senado/2025/08/manifest.json")).toBe(true);
    expect(plan.publishPlan.repair.recordCount).toBe(2);
  });

  it("bloquea un conteo distinto del catálogo", () => {
    expect(() => buildRepairPlan({
      result: { sourceId: "senado", dataset: "foreign_missions", year: 2026, month: 2, records: [record(1, "2026-02-01")] },
      existingCatalog: { sources: [], partitions: [{ id: "senado/2026/02", sourceId: "senado", recordCount: 7 }] },
      generatedAt: "2026-09-13T19:00:00.000Z",
    })).toThrow("SENADO_REPAIR_COUNT_MISMATCH");
  });
});
