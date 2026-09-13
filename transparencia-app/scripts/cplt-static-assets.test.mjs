import { describe, expect, it } from "vitest";
import { cpltStaticAssetsForPages, cpltStaticAssetRelativePath } from "./cplt-static-assets.mjs";

describe("CPLT static asset keys", () => {
  const version = "2026-09-02T03-28-30-598Z";

  it("accepts paginated search assets nested under search_index", () => {
    expect(cpltStaticAssetRelativePath(
      `projections/funcionarios-v1/versions/${version}/search_index/p-0001.json`,
      version,
    )).toBe("search_index/p-0001.json");
  });

  it("accepts a direct versioned projection", () => {
    expect(cpltStaticAssetRelativePath(
      `projections/funcionarios-v1/versions/${version}/muni-maipu.json`,
      version,
    )).toBe("muni-maipu.json");
  });

  it("rejects path traversal in a published asset key", () => {
    expect(() => cpltStaticAssetRelativePath(
      `projections/funcionarios-v1/versions/${version}/search_index/../secret.json`,
      version,
    )).toThrow("CPLT_STATIC_ASSET_KEY_INVALID");
  });

  it("omits only nested search shards from the Pages hydration set", () => {
    const assets = [
      { key: `projections/funcionarios-v1/versions/${version}/muni-maipu.json` },
      { key: `projections/funcionarios-v1/versions/${version}/search_index/p-0001.json` },
      { key: `projections/funcionarios-v1/versions/${version}/search_index.json` },
    ];

    expect(cpltStaticAssetsForPages(assets).map((asset) => asset.key)).toEqual([
      assets[0].key,
      assets[2].key,
    ]);
  });
});
