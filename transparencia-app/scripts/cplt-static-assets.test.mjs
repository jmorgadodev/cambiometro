import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { cpltStaticAssetsForPages, cpltStaticAssetRelativePath, compressCpltProjection, decodeCpltStaticAsset } from "./cplt-static-assets.mjs";

describe("lossless CPLT projection storage", () => {
  const key = "projections/funcionarios-v1/versions/test/muni-tortel.json";
  const raw = Buffer.from(`${JSON.stringify([{ id: "a", mes: "2026-09", bruto: 468212, liquido: null }, { id: "b", bruto: 0, liquido: 0 }])}\n`);
  it("compresses exact bytes and keeps amounts, nulls and identifiers", () => {
    const { data, metadata } = compressCpltProjection(key, raw);
    expect(metadata.key).toBe(`${key}.gz`);
    expect(metadata.encoding).toBe("gzip");
    expect(decodeCpltStaticAsset(metadata, data)).toEqual(raw);
    expect(metadata.originalChecksumSha256).toBe(createHash("sha256").update(raw).digest("hex"));
  });
  it("retains support for verified uncompressed releases", () => {
    expect(decodeCpltStaticAsset({ key, size: raw.length, checksumSha256: createHash("sha256").update(raw).digest("hex") }, raw)).toEqual(raw);
  });
  it("rejects changed compressed bytes before hydration", () => {
    const { data, metadata } = compressCpltProjection(key, raw);
    expect(() => decodeCpltStaticAsset(metadata, Buffer.concat([data, Buffer.from("x")]))).toThrow("CPLT_STATIC_CHECKSUM_MISMATCH");
  });
  it("rejects absent or incorrect original integrity metadata", () => {
    const { data, metadata } = compressCpltProjection(key, raw);
    expect(() => decodeCpltStaticAsset({ ...metadata, originalSize: undefined }, data)).toThrow("CPLT_STATIC_GZIP_METADATA_INVALID");
    expect(() => decodeCpltStaticAsset({ ...metadata, originalChecksumSha256: "0".repeat(64) }, data)).toThrow("CPLT_STATIC_ORIGINAL_CHECKSUM_MISMATCH");
    expect(() => decodeCpltStaticAsset({ ...metadata, originalSize: raw.length - 1 }, data)).toThrow();
  });
  it("hydrates gzip projections into JSON, repairs cached JSON and accepts legacy search gzip", () => {
    const root = mkdtempSync(join(tmpdir(), "cplt-hydrate-test-"));
    try {
      const put = (file, data) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, data); };
      for (const file of ["hydrate-cplt-static-fallback.mjs", "cplt-static-assets.mjs"]) {
        mkdirSync(join(root, "scripts"), { recursive: true });
        copyFileSync(join(import.meta.dirname, file), join(root, "scripts", file));
      }
      put(join(root, "node_modules/wrangler/bin/wrangler.js"), `const fs = require('node:fs'); const path = require('node:path'); fs.copyFileSync(path.join(process.cwd(), 'remote', process.argv[5].split('/').slice(1).join('/')), process.argv[process.argv.indexOf('--file') + 1]);`);
      const { data, metadata } = compressCpltProjection(key, raw);
      const searchData = gzipSync("[0]");
      const search = { key: "projections/funcionarios-v1/versions/test/search_index/organisms/tortel.json.gz", encoding: "gzip", size: searchData.length, checksumSha256: createHash("sha256").update(searchData).digest("hex") };
      const manifest = { schemaVersion: "1.0.0", sourceId: "transparencia-activa", version: "test", coverage: Array.from({ length: 346 }, () => ({})), assets: [metadata, search] };
      put(join(root, "remote", metadata.key), data);
      put(join(root, "remote", search.key), searchData);
      put(join(root, "remote/projections/funcionarios-v1/manifest.json"), JSON.stringify(manifest));
      const execute = () => spawnSync(process.execPath, [join(root, "scripts/hydrate-cplt-static-fallback.mjs"), "--required"], { cwd: root, encoding: "utf8" });
      const target = join(root, "data/lake-cplt", key);
      const first = execute();
      expect(first.status, first.stderr).toBe(0);
      expect(readFileSync(target)).toEqual(raw);
      writeFileSync(target, "stale");
      const cached = execute();
      expect(cached.status, cached.stderr).toBe(0);
      expect(readFileSync(target)).toEqual(raw);
      expect(existsSync(join(root, "data/lake-cplt", search.key.slice(0, -3)))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("CPLT static asset keys", () => {
  const version = "2026-09-02T03-28-30-598Z";

  it("accepts paginated search assets nested under search_index", () => {
    expect(cpltStaticAssetRelativePath(
      `projections/funcionarios-v1/versions/${version}/search_index/p-0001.json`,
      version,
    )).toBe("search_index/p-0001.json");
  });

  it("accepts compressed search pages but never hydrates them into Pages", () => {
    const key = `projections/funcionarios-v1/versions/${version}/search_index/p-0001.json.gz`;
    expect(cpltStaticAssetRelativePath(key, version)).toBe("search_index/p-0001.json.gz");
    expect(cpltStaticAssetsForPages([{key}])).toEqual([]);
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
