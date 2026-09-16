import { describe, expect, it } from "vitest";
import { assertCatalogReferencesAvailable, auditCatalogReferences, partitionManifestKey } from "./r2-catalog-audit.mjs";

describe("auditoría de referencias del catálogo R2", () => {
  it("calcula la ruta por defecto de una partición", () => {
    expect(partitionManifestKey({ sourceId: "senado", period: "2026-07" }))
      .toBe("partitions/senado/2026/07/manifest.json");
  });

  it("distingue particiones físicas de referencias huérfanas", () => {
    const report = auditCatalogReferences({ partitions: [
      { id: "senado/2026/07", sourceId: "senado", period: "2026-07", recordCount: 50 },
      { id: "senado/2026/06", sourceId: "senado", period: "2026-06", recordCount: 40 },
    ] }, ["partitions/senado/2026/07/manifest.json"]);

    expect(report.presentPartitions).toBe(1);
    expect(report.missingPartitions).toBe(1);
    expect(report.missingRows).toBe(40);
    expect(report.bySource).toEqual([{ sourceId: "senado", partitions: 2, present: 1, missing: 1, declaredRows: 90, missingRows: 40 }]);
  });

  it("bloquea activar un catálogo que apunta a objetos ausentes", () => {
    expect(() => assertCatalogReferencesAvailable({ partitions: [
      { sourceId: "dipres", period: "2026-07", recordCount: 10 },
    ] }, new Set())).toThrow("R2_CATALOG_ORPHANED_PARTITIONS");
  });
});
