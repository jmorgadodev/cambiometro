import { describe, expect, it } from "vitest";
import { buildRemunerationAudit } from "./remuneraciones-audit.mjs";

describe("buildRemunerationAudit", () => {
  it("separa el release estático de los universos municipales y centrales", () => {
    const report = buildRemunerationAudit({
      generatedAt: "2026-09-16T12:00:00.000Z",
      unifiedManifest: {
        schemaVersion: 1,
        generatedAt: "2026-09-16T08:00:00.000Z",
        totalRows: 33776,
        pageCount: 169,
        sources: [
          { id: "transparencia-activa", publishedCount: 1203287, queryableCount: 1203287, status: "partial" },
          { id: "remuneraciones-38bis", publishedCount: 29703, queryableCount: 29703, status: "complete" },
        ],
      },
      productionSources: [{ id: "cplt", recordCount: 1243761, status: "partial" }],
      scopeResponses: {
        municipal: { meta: { total: 1243761, updatedAt: "2026-09-15T08:08:44.566Z", calidadDatos: { registrosConIncidencias: 159705 } } },
        central: { meta: { total: 2110434, updatedAt: "2026-09-14T03:51:42.634Z", calidadDatos: { registrosConIncidencias: 563221 } } },
      },
      probes: [{ label: "Lucy Depablos", scope: "central", total: 4 }],
    });

    expect(report.staticRelease).toMatchObject({ totalRows: 33776, pageCount: 169 });
    expect(report.scopes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "municipal", rows: 1243761, qualityIssues: 159705 }),
      expect.objectContaining({ id: "central", rows: 2110434, qualityIssues: 563221 }),
    ]));
    expect(report.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "STATIC_VS_PRODUCTION_COUNT_MISMATCH", sourceId: "transparencia-activa", delta: 40474 }),
    ]));
    expect(report.probes[0]).toMatchObject({ label: "Lucy Depablos", scope: "central", status: "pass" });
  });

  it("marca una consulta sin resultados como hallazgo, sin convertirla en cero filas del release", () => {
    const report = buildRemunerationAudit({
      unifiedManifest: { schemaVersion: 1, totalRows: 1, pageCount: 1, sources: [] },
      productionSources: [],
      scopeResponses: {},
      probes: [{ label: "Caso ausente", scope: "municipal", total: 0 }],
    });

    expect(report.probes[0]).toMatchObject({ status: "fail", total: 0 });
    expect(report.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "PROBE_NO_RESULTS", label: "Caso ausente" }),
    ]));
    expect(report.releaseMutation).toBe("none");
  });
});
