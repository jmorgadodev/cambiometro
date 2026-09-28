import { describe, expect, it } from "vitest";
import { buildLakePlan } from "../lake.mjs";

describe("resguardo de conteos históricos de Contraloría", () => {
  it("rechaza reemplazar una partición con menos filas que el catálogo vigente", () => {
    const records = Array.from({ length: 33 }, (_, index) => ({
      id: `audit-${index}`,
      fecha: "2026-08-01",
      kind: "audit",
      url: `https://www.contraloria.cl/informe/${index}`,
    }));
    const existingCatalog = {
      partitions: [{
        id: "contraloria/2026/08",
        sourceId: "contraloria",
        period: "2026-08",
        recordCount: 35,
      }],
    };

    expect(() => buildLakePlan(
      { actualizado_en: "2026-09-28T00:00:00.000Z", fuentes: { contraloria: records } },
      { existingCatalog, preserveExistingPartitionCountsFor: ["contraloria"] },
    )).toThrow("PARTITION_RECORD_COUNT_REGRESSION:contraloria/2026/08:33<35");
  });

  it("permite una partición que conserva o aumenta el conteo publicado", () => {
    const records = Array.from({ length: 35 }, (_, index) => ({
      id: `audit-${index}`,
      fecha: "2026-08-01",
      kind: "audit",
      url: `https://www.contraloria.cl/informe/${index}`,
    }));
    const existingCatalog = {
      partitions: [{
        id: "contraloria/2026/08",
        sourceId: "contraloria",
        period: "2026-08",
        recordCount: 35,
      }],
    };

    const plan = buildLakePlan(
      { actualizado_en: "2026-09-28T00:00:00.000Z", fuentes: { contraloria: records } },
      { existingCatalog, preserveExistingPartitionCountsFor: ["contraloria"] },
    );

    expect(plan.catalog.partitions[0].recordCount).toBe(35);
  });
});
