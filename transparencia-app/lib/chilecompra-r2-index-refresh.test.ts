import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

function writeBaseArchive(root: string, records: unknown[]) {
  const archivePath = join(root, "records.jsonl");
  const lines = records.map((record) => `${JSON.stringify(record)}\n`);
  writeFileSync(archivePath, lines.join(""));
  let offset = 0;
  const pages = lines.map((line) => {
    const page = { offset, length: Buffer.byteLength(line) };
    offset += page.length;
    return page;
  });
  const manifestPath = join(root, "base-manifest.json");
  writeFileSync(manifestPath, JSON.stringify({
    schemaVersion: 1,
    sourceId: "chilecompra",
    totalRows: records.length,
    pageSize: 1,
    recordArchiveKey: "indexes/v1/chilecompra/records.jsonl",
    pages,
  }));
  return { archivePath, manifestPath };
}

function invokeRefresh(root: string, base: { archivePath: string; manifestPath: string }, period = "2026-07") {
  const lakeRoot = join(root, "lake");
  const additionKey = `partitions/chilecompra/${period.replace("-", "/")}/records-new.jsonl.gz`;
  const additionPath = join(lakeRoot, ...additionKey.split("/"));
  mkdirSync(join(lakeRoot, ...additionKey.split("/").slice(0, -1)), { recursive: true });
  const additions = [
    { id: "chilecompra-new-record", sourceId: "chilecompra", kind: "contract", occurredAt: `${period}-03`, data: { buyer: { name: "Municipalidad de Prueba" } } },
  ];
  const additionBytes = gzipSync(`${additions.map((record) => JSON.stringify(record)).join("\n")}\n`);
  writeFileSync(additionPath, additionBytes);
  const catalogKey = "catalog/v1/manifest.json";
  const catalogBytes = Buffer.from(JSON.stringify({ partitions: [{
    id: `chilecompra/${period.replace("-", "/")}`,
    sourceId: "chilecompra",
    period,
    recordCount: additions.length,
    manifestKey: `partitions/chilecompra/${period.replace("-", "/")}/manifest.json`,
  }] }));
  const catalogPath = join(lakeRoot, ...catalogKey.split("/"));
  mkdirSync(join(lakeRoot, "catalog", "v1"), { recursive: true });
  writeFileSync(catalogPath, catalogBytes);
  writeFileSync(join(lakeRoot, "publish-plan.json"), JSON.stringify({
    schemaVersion: "1.0.0",
    assets: [
      { key: additionKey, checksumSha256: sha256(additionBytes), size: additionBytes.length, releaseTag: "data-test", releaseAssetName: "records.jsonl.gz" },
      { key: catalogKey, checksumSha256: sha256(catalogBytes), size: catalogBytes.length, releaseTag: "data-test", releaseAssetName: "manifest.json" },
    ],
  }));
  const scriptPath = fileURLToPath(new URL("../scripts/refresh-chilecompra-r2-index.mjs", import.meta.url));
  execFileSync(process.execPath, [
    scriptPath,
    "--period", period,
    "--base-manifest", base.manifestPath,
    "--base-archive", base.archivePath,
    "--lake-root", lakeRoot,
  ], { cwd: process.cwd(), stdio: "pipe" });
  return { lakeRoot, additionKey };
}

describe("refresh-chilecompra-r2-index", () => {
  it("merges a new published month into the full index and stages immutable R2-only assets", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "chilecompra-index-refresh-"));
    try {
      const base = writeBaseArchive(temporaryRoot, [
        { id: "chilecompra-old", sourceId: "chilecompra", kind: "contract", occurredAt: "2026-06-12", data: { buyer: { name: "Municipalidad Antigua" } } },
        { id: "chilecompra-old-2", sourceId: "chilecompra", kind: "contract", occurredAt: "2026-06-20", data: { buyer: { name: "Hospital Antiguo" } } },
      ]);

      const { lakeRoot, additionKey } = invokeRefresh(temporaryRoot, base);
      const plan = JSON.parse(readFileSync(join(lakeRoot, "publish-plan.json"), "utf8"));
      const indexAssets = plan.assets.filter((asset: { key: string }) => asset.key.startsWith("indexes/v1/chilecompra/"));
      const activeManifestAsset = indexAssets.find((asset: { key: string }) => asset.key === "indexes/v1/chilecompra/manifest.json");
      const activeManifestPath = join(lakeRoot, activeManifestAsset.key);
      const manifest = JSON.parse(readFileSync(activeManifestPath, "utf8"));
      const archiveText = readFileSync(join(lakeRoot, manifest.recordArchiveKey), "utf8");
      const archiveRecords = archiveText.trim().split("\n").map((line: string) => JSON.parse(line));
      const periodIndex = JSON.parse(readFileSync(join(lakeRoot, manifest.periodIndexKey), "utf8"));
      const rollbackAsset = indexAssets.find((asset: { key: string }) => asset.key === manifest.rollbackManifestKey);

      expect(archiveRecords.map((record: { id: string }) => record.id)).toEqual([
        "chilecompra-new-record",
        "chilecompra-old-2",
        "chilecompra-old",
      ]);
      expect(manifest.totalRows).toBe(3);
      expect(manifest.recordArchiveKey).not.toBe("indexes/v1/chilecompra/records.jsonl");
      expect(manifest.rollbackManifestKey).toMatch(/^indexes\/v1\/chilecompra\/manifest-[a-f0-9]{64}\.json$/u);
      expect(rollbackAsset).toBeDefined();
      expect(indexAssets.every((asset: { r2Only?: boolean }) => asset.r2Only === true)).toBe(true);
      expect(plan.assets.some((asset: { key: string }) => asset.key === additionKey)).toBe(true);
      expect(periodIndex.months["2026-06"].recordCount).toBe(2);
      expect(periodIndex.months["2026-07"].recordCount).toBe(1);
      for (const asset of indexAssets) {
        const path = join(lakeRoot, asset.key);
        const content = readFileSync(path);
        expect(content.length).toBe(asset.size);
        expect(sha256(content)).toBe(asset.checksumSha256);
      }
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("refuses a duplicate record ID before changing the publication plan", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "chilecompra-index-duplicate-"));
    try {
      const duplicate = { id: "chilecompra-new-record", sourceId: "chilecompra", kind: "contract", occurredAt: "2026-06-12", data: {} };
      const base = writeBaseArchive(temporaryRoot, [duplicate]);
      expect(() => invokeRefresh(temporaryRoot, base)).toThrow(/DUPLICATE_CHILECOMPRA_INDEX_RECORD/u);
      const plan = JSON.parse(readFileSync(join(temporaryRoot, "lake", "publish-plan.json"), "utf8"));
      expect(plan.assets).toHaveLength(2);
      expect(plan.assets[0].key).toContain("partitions/chilecompra/2026/07/");
      expect(plan.assets.some((asset: { key: string }) => asset.key.startsWith("indexes/v1/chilecompra/"))).toBe(false);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });
});
