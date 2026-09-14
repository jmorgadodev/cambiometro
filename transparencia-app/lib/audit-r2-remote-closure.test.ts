import { describe, expect, it } from "vitest";
import { auditCatalogClosure, catalogPartitionKeys, catalogProjectionArtifactKey, classifyR2Closure, summarizeR2ClosureBySource, summarizeR2ClosureGaps } from "../scripts/audit-r2-remote-closure.mjs";

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
        { sourceId: "camara", manifestKey: "partitions/camara/votaciones_camara/2026/08/manifest.json" },
      ],
    };

    expect(catalogPartitionKeys(catalog, "votaciones_senado")).toEqual([
      "partitions/votaciones_senado/2026/07/manifest.json",
    ]);
    expect(catalogPartitionKeys(catalog, "votaciones_camara")).toEqual([
      "partitions/camara/votaciones_camara/2026/08/manifest.json",
      "partitions/votaciones_camara/2026/07/manifest.json",
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

  it("separa catálogo incompleto de fuente no disponible", () => {
    expect(classifyR2Closure({
      complete: false,
      artifactCheck: "physical_get",
      missingManifests: ["partitions/senado/2026/09/manifest.json"],
      missingArtifacts: [],
      missingManifestArtifacts: [{ manifestKey: "x", artifactKey: "y" }],
      presentWithoutManifest: [],
      missingArtifactInventory: [],
    })).toMatchObject({ status: "catalogued_without_manifest", promotionAllowed: false });

    expect(classifyR2Closure({
      complete: true,
      artifactCheck: "physical_get",
      missingManifests: [],
      missingArtifacts: [],
      missingManifestArtifacts: [],
      presentWithoutManifest: [],
      missingArtifactInventory: [],
    })).toMatchObject({ status: "verifiable", promotionAllowed: true });
  });

  it("resume brechas por fuente sin ocultar las claves originales", () => {
    expect(summarizeR2ClosureGaps({
      missingManifests: [
        "partitions/camara/2026/07/manifest.json",
        "partitions/camara/2026/08/manifest.json",
        "partitions/senado/2026/09/manifest.json",
      ],
      missingArtifactInventory: [
        "partitions/camara/2026/07/records-a.jsonl.gz",
        "indexes/v1/camara/entities-a.jsonl.gz",
      ],
    })).toMatchObject({
      missingManifests: [
        { sourceId: "camara", count: 2 },
        { sourceId: "senado", count: 1 },
      ],
      missingArtifactInventory: [
        { sourceId: "camara", count: 1 },
        { sourceId: "unknown", count: 1 },
      ],
    });
  });

  it("no trata una fuente sin particiones catalogadas como completa", () => {
    expect(classifyR2Closure({
      checkedPartitions: 0,
      complete: true,
      missingManifests: [],
      missingArtifacts: [],
      missingManifestArtifacts: [],
      missingArtifactInventory: [],
      presentWithoutManifest: [],
    })).toMatchObject({ status: "no_catalog_partitions", promotionAllowed: false });
  });

  it("construye una matriz independiente por fuente", () => {
    const catalog = {
      partitions: [
        { sourceId: "camara", manifestKey: "partitions/camara/votaciones_camara/2026/07/manifest.json" },
        { sourceId: "senado", manifestKey: "partitions/senado/2026/07/manifest.json" },
      ],
    };
    const manifests = new Map([
      ["partitions/camara/votaciones_camara/2026/07/manifest.json", { artifacts: [{ key: "partitions/camara/votaciones_camara/2026/07/records.jsonl.gz" }] }],
      ["partitions/senado/2026/07/manifest.json", { artifacts: [{ key: "partitions/senado/2026/07/records.jsonl.gz" }] }],
    ]);
    expect(summarizeR2ClosureBySource(catalog, manifests, {
      missingManifests: ["partitions/senado/2026/07/manifest.json"],
      missingArtifactInventory: ["partitions/camara/votaciones_camara/2026/07/records.jsonl.gz"],
    })).toEqual([
      {
        sourceId: "camara",
        partitions: 1,
        manifestsPresent: 1,
        missingManifests: 0,
        missingArtifactInventory: 1,
        status: "manifest_without_artifact",
        promotionAllowed: false,
      },
      {
        sourceId: "senado",
        partitions: 1,
        manifestsPresent: 0,
        missingManifests: 1,
        missingArtifactInventory: 0,
        status: "catalogued_without_manifest",
        promotionAllowed: false,
      },
    ]);
  });
});
