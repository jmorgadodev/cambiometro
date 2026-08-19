import { describe, expect, it } from "vitest";
import { mergeR2Catalog } from "@/lib/r2-catalog";
import { mergeCpltCatalog } from "@/lib/published-sources";
import type { SourceManifest } from "@/lib/data-contracts";

describe("catálogo runtime de R2", () => {
  it("combina el inventario de D1 y R2 sin perder el mayor conteo validado", () => {
    const base = [{ id: "camara", label: "Cámara", organization: "Congreso", url: "https://example.test", license: "pública", commercialUse: "unknown", expectedCoverage: "todo", foundPeriods: [], lastUpdated: null, checksumSha256: null, recordCount: 0, errorCount: 0, status: "unavailable", statusDetail: "pendiente" }] satisfies SourceManifest[];
    const merged = mergeR2Catalog(base, { schemaVersion: "1.0.0", generatedAt: "2026-08-08T00:00:00Z", sources: [{ id: "camara", status: "partial", foundPeriods: ["2026-08"], recordCount: 42 }], partitions: [{ id: "camara/2026/08", sourceId: "camara", period: "2026-08", manifestKey: "partitions/camara/2026/08/manifest.json", checksumSha256: "abc", status: "partial" }] });
    expect(merged[0]).toMatchObject({ foundPeriods: ["2026-08"], recordCount: 42, checksumSha256: "abc", status: "partial" });
  });

  it("expone el conteo archivado cuando la fuente se sirve bajo demanda desde R2", () => {
    const base = [{ id: "servel", label: "SERVEL", organization: "SERVEL", url: "https://example.test", license: "pública", commercialUse: "unknown", expectedCoverage: "todo", foundPeriods: [], lastUpdated: null, checksumSha256: null, recordCount: 0, errorCount: 0, status: "partial", statusDetail: "archivo", storageTier: "r2" }] satisfies SourceManifest[];
    const merged = mergeR2Catalog(base, { schemaVersion: "1.0.0", generatedAt: "2026-08-12T00:00:00Z", sources: [{ id: "servel", status: "partial", foundPeriods: ["2025-11"], recordCount: 23894 }], partitions: [{ id: "servel/2025/11", sourceId: "servel", period: "2025-11", manifestKey: "partitions/servel/2025/11/manifest.json", checksumSha256: "def", status: "partial" }] });
    expect(merged[0]).toMatchObject({ recordCount: 23894, storageTier: "r2", status: "partial" });
  });

  it("mantiene indisponible una fuente cuando D1 y R2 están vacíos", () => {
    const base = [{ id: "transparencia-activa", label: "CPLT", organization: "CPLT", url: "https://example.test", license: "pública", commercialUse: "unknown", expectedCoverage: "todo", foundPeriods: [], lastUpdated: null, checksumSha256: null, recordCount: 0, errorCount: 0, status: "unavailable", statusDetail: "Sin datos", storageTier: "d1" }] satisfies SourceManifest[];
    const merged = mergeR2Catalog(base, { schemaVersion: "1.0.0", generatedAt: "2026-08-12T00:00:00Z", sources: [{ id: "transparencia-activa", status: "partial", foundPeriods: [], recordCount: 0 }], partitions: [] });
    expect(merged[0]).toMatchObject({ recordCount: 0, status: "unavailable" });
  });

  it("incorpora el manifiesto nacional de Transparencia Activa", () => {
    const base = [{ id: "transparencia-activa", label: "CPLT", organization: "CPLT", url: "https://example.test", license: "pública", commercialUse: "unknown", expectedCoverage: "todo", foundPeriods: [], lastUpdated: null, checksumSha256: null, recordCount: 0, errorCount: 0, status: "unavailable", statusDetail: "Sin datos" }] satisfies SourceManifest[];
    const merged = mergeCpltCatalog(base, {
      sourceId: "transparencia-activa",
      generatedAt: "2026-08-13T00:00:00Z",
      recordCount: 1_203_287,
      version: "2026-08",
    });

    expect(merged[0]).toMatchObject({
      recordCount: 1_203_287,
      status: "partial",
      storageTier: "r2",
      lastUpdated: "2026-08-13T00:00:00Z",
    });
  });
});
