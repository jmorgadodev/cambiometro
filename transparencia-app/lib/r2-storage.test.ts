import { describe, expect, it } from "vitest";
import { activeProjectionVersions, summarizeR2Storage } from "../scripts/etl/r2-storage.mjs";

describe("auditoría de almacenamiento R2", () => {
  it("calcula margen, prefijos y duplicados potenciales", () => {
    const summary = summarizeR2Storage({
      limitBytes: 1_000,
      usedBytes: 850,
      objects: [
        { key: "projections/a.json", size: 500, checksumSha256: "same" },
        { key: "projections/b.json", size: 200, checksumSha256: "same" },
        { key: "partitions/a.json", size: 150, checksumSha256: "other" },
      ],
    });
    expect(summary.status).toBe("archive-review");
    expect(summary.growthAllowed).toBe(true);
    expect(summary.freeBytes).toBe(150);
    expect(summary.computedBytes).toBe(850);
    expect(summary.duplicateBytes).toBe(200);
    expect(summary.byPrefix[0]).toMatchObject({ prefix: "projections", bytes: 700 });
  });

  it("bloquea crecimiento desde el umbral crítico", () => {
    const summary = summarizeR2Storage({
      limitBytes: 1_000,
      usedBytes: 950,
      objects: [{ key: "a", size: 950, checksumSha256: "a" }],
    });
    expect(summary.status).toBe("growth-blocked");
    expect(summary.growthAllowed).toBe(false);
  });

  it("detecta una diferencia entre el contador declarado y los objetos", () => {
    const summary = summarizeR2Storage({
      limitBytes: 1_000,
      usedBytes: 700,
      objects: [{ key: "a", size: 600, checksumSha256: "a" }],
    });
    expect(summary.accountingDeltaBytes).toBe(100);
  });

  it("desglosa las versiones de proyección sin tratarlas como candidatas a borrar", () => {
    const summary = summarizeR2Storage({
      limitBytes: 10_000,
      usedBytes: 300,
      objects: [
        { key: "projections/funcionarios-v1/versions/v1/a.json", size: 100, checksumSha256: "a" },
        { key: "projections/funcionarios-v1/versions/v1/b.json", size: 50, checksumSha256: "b" },
        { key: "projections/funcionarios-v1/versions/v2/a.json", size: 150, checksumSha256: "c" },
      ],
    });
    expect(summary.projectionVersions).toEqual([
      { dataset: "funcionarios-v1", version: "v1", objects: 2, bytes: 150, retentionStatus: "unclassified" },
      { dataset: "funcionarios-v1", version: "v2", objects: 1, bytes: 150, retentionStatus: "unclassified" },
    ]);
  });

  it("marca las versiones activas e históricas desde sus manifiestos", () => {
    const active = activeProjectionVersions([
      { sourceId: "funcionarios-v1", version: "v2" },
      { sourceId: "funcionarios-central-v1", version: "v1" },
    ]);
    const summary = summarizeR2Storage({
      limitBytes: 10_000,
      usedBytes: 300,
      objects: [
        { key: "projections/funcionarios-v1/versions/v1/a.json", size: 100, checksumSha256: "a" },
        { key: "projections/funcionarios-v1/versions/v2/a.json", size: 150, checksumSha256: "b" },
      ],
    }, { activeVersions: active });
    expect(summary.projectionVersions).toEqual([
      { dataset: "funcionarios-v1", version: "v2", objects: 1, bytes: 150, retentionStatus: "active" },
      { dataset: "funcionarios-v1", version: "v1", objects: 1, bytes: 100, retentionStatus: "historical" },
    ]);
    expect(summary.historicalProjectionBytes).toBe(100);
  });
});
