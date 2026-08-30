import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { planR2Publication, selectHotAssets } from "../scripts/etl/r2.mjs";

const asset = (key: string, size = 10, checksumSha256 = key) => ({ key, size, checksumSha256, data: Buffer.alloc(size), releaseTag: "x", releaseAssetName: key });

it("no permite reemplazar assets de una Release inmutable", () => {
  const publisher = readFileSync(resolve("scripts/publish-data-lake.mjs"), "utf8");
  expect(publisher).not.toContain('"--clobber"');
  expect(publisher).toContain("IMMUTABLE_RELEASE_CONFLICT");
  expect(publisher.indexOf("for (const key of r2Plan.deletes)")).toBeLessThan(publisher.indexOf("for (const asset of r2Plan.puts"));
});

describe("publicación caliente en R2", () => {
  it("conserva catálogo y sólo la partición más reciente de cada fuente", () => {
    const hot = selectHotAssets([
      asset("catalog/v1/manifest.json"),
      asset("partitions/camara/2026/06/records.jsonl.gz"),
      asset("partitions/camara/2026/07/records.jsonl.gz"),
      asset("partitions/infolobby/2025/12/records.jsonl.gz"),
    ]);
    expect(hot.map((item: { key: string }) => item.key)).toEqual([
      "catalog/v1/manifest.json",
      "partitions/camara/2026/07/records.jsonl.gz",
      "partitions/infolobby/2025/12/records.jsonl.gz",
    ]);
  });

  it("elimina objetos fríos administrados y bloquea crecimiento desde 90 %", () => {
    const plan = planR2Publication([asset("catalog/v1/manifest.json", 81)], {
      objects: [{ key: "partitions/old/2020/01/records.jsonl.gz", size: 80, checksumSha256: "old" }],
    }, 100);
    expect(plan.action).toBe("archive_cold_partitions");
    expect(plan.deletes).toEqual(["partitions/old/2020/01/records.jsonl.gz"]);

    expect(() => planR2Publication([asset("catalog/v1/manifest.json", 91)], { objects: [] }, 100))
      .toThrow("R2_GROWTH_BLOCKED_AT_90_PERCENT");
  });

  it("no elimina una partición vigente ausente de un plan incremental", () => {
    const catalog = asset("catalog/v1/manifest.json", 10, "catalog");
    catalog.data = Buffer.from(JSON.stringify({ partitions: [{ id: "dipres/2026/06", sourceId: "dipres", period: "2026-06", manifestKey: "partitions/dipres/2026/06/manifest.json" }] }));
    catalog.size = catalog.data.length;
    const plan = planR2Publication([catalog, asset("partitions/sinim/2025/12/records.jsonl.gz", 10)], {
      objects: [{ key: "partitions/dipres/2026/06/records.jsonl.gz", size: 80, checksumSha256: "dipres" }],
    }, 1000);
    expect(plan.deletes).toEqual([]);
    expect(plan.inventory.objects.some((item: { key: string }) => item.key === "partitions/dipres/2026/06/records.jsonl.gz")).toBe(true);
  });

  it("publica el catalogo vigente solamente despues de todos los objetos versionados", () => {
    const plan = planR2Publication([
      asset("catalog/v1/manifest.json", 10, "catalog-new"),
      asset("partitions/camara/2026/08/manifest.json", 10, "partition-manifest"),
      asset("partitions/camara/2026/08/records.jsonl.gz", 10, "records"),
    ]);

    expect(plan.puts.at(-1)?.key).toBe("catalog/v1/manifest.json");
  });

  it("conserva proyecciones CPLT y publica su manifiesto vigente al final", () => {
    const plan = planR2Publication([
      asset("projections/funcionarios-v1/manifest.json", 10, "manifest"),
      asset("projections/funcionarios-v1/versions/2026-08-12/search_index.json", 10, "index"),
    ]);
    expect(plan.puts.map((item: { key: string }) => item.key)).toEqual([
      "projections/funcionarios-v1/versions/2026-08-12/search_index.json",
      "projections/funcionarios-v1/manifest.json",
    ]);
  });

  it("retiene la version anterior como rollback y elimina proyecciones historicas obsoletas", () => {
    const prefix = "projections/funcionarios-v1/versions";
    const plan = planR2Publication([
      asset("projections/funcionarios-v1/manifest.json", 5, "manifest-v4"),
      asset(`${prefix}/2026-08-30/search_index.json`, 30, "v4"),
    ], {
      objects: [
        { key: `${prefix}/2026-08-13/search_index.json`, size: 30, checksumSha256: "v1" },
        { key: `${prefix}/2026-08-15/search_index.json`, size: 30, checksumSha256: "v2" },
        { key: `${prefix}/2026-08-26/search_index.json`, size: 30, checksumSha256: "v3" },
        { key: "projections/otro-v1/versions/2026-08-01/data.json", size: 10, checksumSha256: "other" },
      ],
    }, 100);

    expect(plan.deletes).toEqual([
      `${prefix}/2026-08-13/search_index.json`,
      `${prefix}/2026-08-15/search_index.json`,
    ]);
    expect(plan.inventory.objects.map((item: { key: string }) => item.key)).toContain(`${prefix}/2026-08-26/search_index.json`);
    expect(plan.inventory.objects.map((item: { key: string }) => item.key)).toContain(`${prefix}/2026-08-30/search_index.json`);
    expect(plan.inventory.objects.map((item: { key: string }) => item.key)).toContain("projections/otro-v1/versions/2026-08-01/data.json");
    expect(plan.ratio).toBeLessThan(0.9);
  });
});
