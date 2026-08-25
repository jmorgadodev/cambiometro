import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildChunkManifest, chunkRows, writeChunkedJson } from "../scripts/static-site-data.mjs";

describe("static site data", () => {
  it("divide filas en páginas numeradas de tamaño estable", () => {
    const rows = Array.from({ length: 105 }, (_, index) => ({ id: index + 1 }));

    expect(chunkRows(rows, 50)).toEqual([
      rows.slice(0, 50),
      rows.slice(50, 100),
      rows.slice(100),
    ]);
  });

  it("genera un manifest reproducible con conteos y nombres de chunks", () => {
    const manifest = buildChunkManifest("transferencias", 105, 50, "sha256:test");

    expect(manifest).toEqual({
      schemaVersion: 1,
      dataset: "transferencias",
      totalRows: 105,
      pageSize: 50,
      totalPages: 3,
      pages: ["p-0001.json", "p-0002.json", "p-0003.json"],
      checksumSha256: "sha256:test",
    });
  });

  it("genera el esquema completo de páginas para el fixture de transferencias", () => {
    const output = mkdtempSync(join(tmpdir(), "cambiometro-transfer-fixture-"));
    try {
      const rows = [
        { id: "a", period: "2026", fecha: "2026-01-01", emitter_name: "Emisor", receiver_name: "Receptor", monto_clp: 10 },
        { id: "b", period: "2026", fecha: "2026-01-02", emitter_name: "Emisor", receiver_name: "Receptor 2", monto_clp: 20 },
      ];
      const manifest = writeChunkedJson({ outputDir: output, dataset: "ley-19862-transferencias", rows, pageSize: 1 }) as unknown as {
        pages: Array<{ page: number; path: string; count: number; sha256: string }>;
        searchIndex: { path: string; count: number; sha256: string };
        expected: { totalMontoClp: number; totalReceptores: number; totalEmisores: number };
      };
      const page = JSON.parse(readFileSync(join(output, "p-0001.json"), "utf8"));

      expect(manifest.pages).toEqual([
        expect.objectContaining({ page: 1, path: "/data/transferencias/p-0001.json", count: 1, sha256: expect.any(String) }),
        expect.objectContaining({ page: 2, path: "/data/transferencias/p-0002.json", count: 1, sha256: expect.any(String) }),
      ]);
      expect(manifest.searchIndex).toMatchObject({ path: "/data/transferencias/search-index.json", count: 2, sha256: expect.any(String) });
      expect(page).toEqual([rows[0]]);
      expect(manifest.expected).toMatchObject({ totalMontoClp: 30, totalReceptores: 2, totalEmisores: 1 });
    } finally {
      rmSync(output, { recursive: true, force: true });
    }
  });
});
