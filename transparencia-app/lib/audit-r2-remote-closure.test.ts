import { describe, expect, it } from "vitest";
import { auditCatalogClosure, catalogPartitionKeys, catalogProjectionArtifactKey } from "../scripts/audit-r2-remote-closure.mjs";

describe("auditoría de cierre del catálogo R2", () => {
  it("deriva sólo la clave de proyección de un checksum completo", () => {
    expect(catalogProjectionArtifactKey({
      manifestKey: "partitions/infoprobidad/2026/01/manifest.json",
      checksumSha256: "a".repeat(64),
    })).toBe(`partitions/infoprobidad/2026/01/records-${"a".repeat(64)}.jsonl.gz`);
    expect(catalogProjectionArtifactKey({ manifestKey: "partitions/x/manifest.json", checksumSha256: "short" })).toBeNull();
  });

  it("selecciona sólo las particiones de la fuente solicitada", () => {
    const catalog = {
      partitions: [
        { sourceId: "votaciones_senado", manifestKey: "partitions/votaciones_senado/2026/07/manifest.json" },
        { sourceId: "votaciones_camara", manifestKey: "partitions/votaciones_camara/2026/07/manifest.json" },
      ],
    };

    expect(catalogPartitionKeys(catalog, "votaciones_senado")).toEqual([
      "partitions/votaciones_senado/2026/07/manifest.json",
    ]);
  });

  it("detecta manifiestos y artefactos faltantes sin convertirlos en cero registros", () => {
    const catalog = {
      partitions: [
        { sourceId: "votaciones_senado", manifestKey: "partitions/votaciones_senado/2026/08/manifest.json" },
        { sourceId: "votaciones_senado", manifestKey: "partitions/votaciones_senado/2026/09/manifest.json" },
      ],
    };
    const manifests = {
      "partitions/votaciones_senado/2026/08/manifest.json": {
        artifacts: [{ key: "partitions/votaciones_senado/2026/08/records.jsonl.gz" }],
      },
    };

    expect(auditCatalogClosure(catalog, manifests, "votaciones_senado")).toEqual({
      complete: false,
      checkedManifests: 2,
      missingManifests: ["partitions/votaciones_senado/2026/09/manifest.json"],
      missingArtifacts: ["partitions/votaciones_senado/2026/08/records.jsonl.gz"],
    });
  });

  it("declara cierre completo cuando cada manifiesto y artefacto está presente", () => {
    const catalog = {
      partitions: [{ sourceId: "votaciones_senado", manifestKey: "partitions/votaciones_senado/2026/07/manifest.json" }],
    };
    const manifests = {
      "partitions/votaciones_senado/2026/07/manifest.json": {
        artifacts: [{ key: "partitions/votaciones_senado/2026/07/records.jsonl.gz" }],
      },
      "partitions/votaciones_senado/2026/07/records.jsonl.gz": true,
    };

    expect(auditCatalogClosure(catalog, manifests, "votaciones_senado")).toEqual({
      complete: true,
      checkedManifests: 1,
      missingManifests: [],
      missingArtifacts: [],
    });
  });
});
