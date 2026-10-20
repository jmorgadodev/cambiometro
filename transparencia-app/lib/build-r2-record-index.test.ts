import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { readR2EvidenceRecords } from "./r2-records";

describe("build-r2-record-index", () => {
  it("packs independently readable gzip pages without losing dates, search, Unicode, zero or null", async () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "cambiometro-compressed-index-"));
    try {
      const inputPath = join(temporaryRoot, "records.jsonl.gz");
      const outputPath = join(temporaryRoot, "index");
      const records = Array.from({ length: 53 }, (_, index) => ({
        id: `compra-${String(index).padStart(3, "0")}`, sourceId: "chilecompra", kind: "contract",
        occurredAt: index < 50 ? "2026-07-22" : "2026-06-12",
        data: { title: "Ñuñoa educación", monto_clp: index === 0 ? 0 : null },
      }));
      writeFileSync(inputPath, gzipSync(records.map((record) => `${JSON.stringify(record)}\n`).join("")));
      execFileSync(process.execPath, [fileURLToPath(new URL("../scripts/build-r2-record-index.mjs", import.meta.url)),
        "--source", "chilecompra", "--input", inputPath, "--output", outputPath, "--archive-encoding", "gzip-pages"]);
      const manifest = JSON.parse(readFileSync(join(outputPath, "manifest.json"), "utf8"));
      expect(manifest.archiveEncoding).toBe("gzip-pages");
      expect(manifest.recordArchiveKey).toBe(manifest.dateArchiveKey);
      const bytes = readFileSync(join(outputPath, manifest.recordArchiveKey.split("/").at(-1)));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(manifest.recordArchiveChecksumSha256);
      expect(bytes.length).toBeLessThan(Buffer.byteLength(records.map((record) => `${JSON.stringify(record)}\n`).join("")));
      expect(manifest.pages.flatMap((page: { offset: number; length: number }) =>
        gunzipSync(bytes.subarray(page.offset, page.offset + page.length)).toString("utf8").trim().split("\n").map((line) => JSON.parse(line))))
        .toEqual(records);
      const ranges: Array<{ offset: number; length: number }> = [];
      const bucket = { get: async (key: string, options?: { range?: { offset: number; length: number } }) => {
        if (key === "catalog/v1/manifest.json") return { json: async <T,>() => ({ sources: [{ id: "chilecompra", recordCount: 53 }], partitions: [] } as T), arrayBuffer: async () => new ArrayBuffer(0) };
        let data = readFileSync(join(outputPath, key.split("/").at(-1)!));
        if (options?.range) {
          ranges.push(options.range);
          data = data.subarray(options.range.offset, options.range.offset + options.range.length);
        }
        return { json: async <T,>() => JSON.parse(data.toString("utf8")) as T, arrayBuffer: async () => Uint8Array.from(data).buffer };
      } };
      const first = await readR2EvidenceRecords(bucket, { source: "chilecompra", limit: 50 });
      expect(first).toMatchObject({ total: 53, complete: true, nextCursor: "v1_1e" });
      expect(first?.data[0].amount?.amountClp).toBe(0);
      expect(first?.data[1].amount).toBeNull();
      expect(ranges).toEqual([manifest.pages[0]]);
      const next = await readR2EvidenceRecords(bucket, { source: "chilecompra", limit: 50, cursor: first?.nextCursor ?? undefined });
      expect(next?.data.map((record) => record.id)).toEqual(records.slice(50).map((record) => record.id));
      expect(await readR2EvidenceRecords(bucket, { source: "chilecompra", query: "educación", limit: 1 })).toMatchObject({ total: 53 });
      expect(await readR2EvidenceRecords(bucket, { source: "chilecompra", period: "2026-06", limit: 10 })).toMatchObject({ total: 3, data: records.slice(50).map((record) => ({ id: record.id })) });
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });
  it.each(["", "gzip-pages"])("writes date-effective month-to-page mappings for bounded Worker filtering (%s)", (encoding) => {
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
      execFileSync(process.execPath, [scriptPath, "--source", "chilecompra", "--input", inputPath, "--output", outputPath,
        ...(encoding ? ["--archive-encoding", encoding] : [])], { cwd: process.cwd() });

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
      const dateBytes = readFileSync(join(outputPath, manifest.dateArchiveKey.split("/").at(-1)));
      expect((encoding ? gunzipSync(dateBytes) : dateBytes).toString("utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line).id))
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
