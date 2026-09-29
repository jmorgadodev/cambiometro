import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

describe("build-r2-record-index", () => {
  it("writes date-effective month-to-page mappings for bounded Worker filtering", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "cambiometro-r2-index-test-"));
    try {
      const inputPath = join(temporaryRoot, "records.jsonl.gz");
      const outputPath = join(temporaryRoot, "index");
      const records = [
        { id: "june", occurredAt: "2026-06-12", data: {} },
        { id: "july", occurredAt: "2026-07-22", data: { source_period: "2026-06" } },
        { id: "undated", occurredAt: null, data: {} },
      ];
      writeFileSync(inputPath, gzipSync(`${records.map((record) => JSON.stringify(record)).join("\n")}\n`));

      const scriptPath = fileURLToPath(new URL("../scripts/build-r2-record-index.mjs", import.meta.url));
      execFileSync(process.execPath, [scriptPath, "--source", "chilecompra", "--input", inputPath, "--output", outputPath], { cwd: process.cwd() });

      const manifest = JSON.parse(readFileSync(join(outputPath, "manifest.json"), "utf8"));
      const periodIndex = JSON.parse(readFileSync(join(outputPath, manifest.periodIndexKey.split("/").at(-1)), "utf8"));
      expect(manifest.periodIndexKey).toBe(`indexes/v1/chilecompra/periods-${manifest.periodIndexChecksumSha256}.json`);
      expect(manifest.dateArchiveKey).toBe(periodIndex.archiveKey);
      expect(periodIndex).toMatchObject({
        schemaVersion: 1,
        sourceId: "chilecompra",
        totalRows: 3,
        undatedRows: 1,
        months: {
          "2026-06": { recordCount: 1, pages: [0] },
          "2026-07": { recordCount: 1, pages: [0] },
        },
        days: {
          "2026-06-12": { recordCount: 1, pages: [0] },
          "2026-07-22": { recordCount: 1, pages: [0] },
        },
      });
      expect(readFileSync(join(outputPath, manifest.dateArchiveKey.split("/").at(-1)), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line).id))
        .toEqual(["july", "june", "undated"]);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("reconstruye el mapa temporal desde un archivo indexado sin modificar el archivo original", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "cambiometro-r2-period-index-test-"));
    try {
      const archivePath = join(temporaryRoot, "records.jsonl");
      const manifestPath = join(temporaryRoot, "manifest.json");
      const outputPath = join(temporaryRoot, "output");
      const records = [
        { id: "june", sourceId: "chilecompra", occurredAt: "2026-06-12", data: {} },
        { id: "july", sourceId: "chilecompra", occurredAt: "2026-07-22", data: { source_period: "2026-06" } },
        { id: "undated", sourceId: "chilecompra", occurredAt: null, data: {} },
      ];
      const lines = records.map((record) => `${JSON.stringify(record)}\n`);
      writeFileSync(archivePath, lines.join(""));
      let offset = 0;
      const pages = lines.map((line) => {
        const page = { offset, length: Buffer.byteLength(line) };
        offset += page.length;
        return page;
      });
      writeFileSync(manifestPath, JSON.stringify({
        schemaVersion: 1,
        sourceId: "chilecompra",
        totalRows: records.length,
        pageSize: 1,
        recordArchiveKey: "indexes/v1/chilecompra/records.jsonl",
        searchIndexKey: "indexes/v1/chilecompra/search.json",
        pages,
      }));

      const scriptPath = fileURLToPath(new URL("../scripts/rebuild-r2-period-index.mjs", import.meta.url));
      execFileSync(process.execPath, [scriptPath, "--source", "chilecompra", "--archive", archivePath, "--manifest", manifestPath, "--output", outputPath], { cwd: process.cwd() });

      const updatedManifest = JSON.parse(readFileSync(join(outputPath, "manifest.json"), "utf8"));
      const sidecarPath = join(outputPath, updatedManifest.periodIndexKey.split("/").at(-1));
      const sidecarText = readFileSync(sidecarPath, "utf8");
      expect(createHash("sha256").update(sidecarText).digest("hex")).toBe(updatedManifest.periodIndexChecksumSha256);
      const dateArchiveText = readFileSync(join(outputPath, updatedManifest.dateArchiveKey.split("/").at(-1)), "utf8");
      expect(createHash("sha256").update(dateArchiveText).digest("hex")).toBe(updatedManifest.dateArchiveChecksumSha256);
      expect(JSON.parse(sidecarText).archiveChecksumSha256).toBe(updatedManifest.dateArchiveChecksumSha256);
      expect(JSON.parse(sidecarText)).toMatchObject({
        totalRows: 3,
        undatedRows: 1,
        months: {
          "2026-06": { recordCount: 1, pages: [1] },
          "2026-07": { recordCount: 1, pages: [0] },
        },
        days: {
          "2026-06-12": { recordCount: 1, pages: [1] },
          "2026-07-22": { recordCount: 1, pages: [0] },
        },
      });
      expect(dateArchiveText.split("\n").filter(Boolean).map((line) => JSON.parse(line).id)).toEqual(["july", "june", "undated"]);
      expect(readFileSync(archivePath, "utf8")).toBe(lines.join(""));
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });
});
