import { describe, expect, it } from "vitest";
import { buildProductionNormalizationAudit, collectProductionNormalizationAudit } from "../../audit-normalization-production.mjs";

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const qualitySources = [
  { id: "camara", label: "Cámara", scope: "parlamento", canonicalCount: 10 },
  { id: "transparencia-activa", label: "Transparencia Activa", scope: "personal", canonicalCount: 20 },
];

describe("auditor productivo de normalización", () => {
  it("clasifica una fuente parcial y una fuente sin detalle sin mutar valores", () => {
    const report = buildProductionNormalizationAudit({
      productionPayload: {
        data: [
          { id: "camara", label: "Cámara", recordCount: 5, status: "partial", lastUpdated: "2026-09-14T00:00:00.000Z", checksumSha256: "12345678901234567890" },
          { id: "cplt", label: "Transparencia Activa", recordCount: 20, status: "partial", lastUpdated: "2026-09-14T00:00:00.000Z" },
        ],
      },
      productionHealth: { ok: true, publicDataBackend: "r2", publicD1Reads: false, r2: true },
      localQualitySources: qualitySources,
      localSourceHealth: {},
      sampleResults: [
        { sourceId: "camara", httpStatus: 200, responseBytes: 100, backend: "r2-lake", sourceStatus: "partial", publishedRows: 5, expectedRows: 10, sampleCount: 1, sampleFieldNames: ["nombre"] },
        { sourceId: "transparencia-activa", httpStatus: 200, responseBytes: 50, backend: "none", sourceStatus: "temporarily-unavailable", availability: "summary-only-or-d1-quota", reason: "r2-unavailable", sampleCount: 0, sampleFieldNames: [] },
      ],
      generatedAt: "2026-09-14T12:00:00.000Z",
    });

    expect(report.policy.d1Used).toBe(false);
    expect(report.rows.find((row) => row.id === "camara").sample.availabilityClass).toBe("partial-release");
    expect(report.rows.find((row) => row.id === "transparencia-activa").sample.availabilityClass).toBe("summary-only");
    expect(report.rows.find((row) => row.id === "camara").productionChecksum).toBe("123456789012…");
  });

  it("consulta sólo endpoints de metadatos y una muestra pequeña por fuente", async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(String(url));
      if (url.includes("/sources?")) return response({ data: [{ id: "camara", recordCount: 1, status: "complete", lastUpdated: "2026-09-14T00:00:00.000Z" }] });
      if (url.includes("/health?")) return response({ data: { ok: true, publicDataBackend: "r2", publicD1Reads: false, r2: true } });
      return response({ data: [{ nombre: "Muestra" }], meta: { sourceBackend: "r2", sourceStatus: "complete", publishedRows: 1, expectedRows: 1 } });
    };

    const report = await collectProductionNormalizationAudit({
      baseUrl: "https://example.test",
      localQualityPath: "data/data-quality-sources.json",
      localHealthPath: "data/etl/source-health.json",
      sampleSources: ["camara"],
      fetchImpl,
      generatedAt: "2026-09-14T12:00:00.000Z",
    });

    expect(report.policy.maxRowsRequestedPerSource).toBe(20);
    expect(calls).toEqual([
      "https://example.test/api/v1/sources?audit=normalization",
      "https://example.test/api/v1/health?audit=normalization",
      "https://example.test/api/v1/records?source=camara&limit=20",
    ]);
  });

  it("resume calidad de la muestra sin exponer valores originales", () => {
    const report = buildProductionNormalizationAudit({
      productionPayload: { data: [{ id: "camara", recordCount: 2 }] },
      productionHealth: { ok: true, publicDataBackend: "r2", publicD1Reads: false, r2: true },
      localQualitySources: [{ id: "camara", canonicalCount: 2 }],
      localSourceHealth: {},
      sampleResults: [{
        sourceId: "camara",
        httpStatus: 200,
        responseBytes: 100,
        backend: "r2",
        sourceStatus: "complete",
        sampleCount: 2,
        sampleFieldNames: ["id", "monto_clp"],
        sampleQuality: { amounts: { reported: 0, zero: 1, notReported: 1, invalid: 0, structured: 0, notAvailable: 0 }, duplicateIds: 1 },
      }],
    });

    expect(report.rows[0].sample.sampleQuality.amounts.zero).toBe(1);
    expect(report.rows[0].sample.sampleQuality.duplicateIds).toBe(1);
    expect(JSON.stringify(report)).not.toContain("valor original");
  });
});
