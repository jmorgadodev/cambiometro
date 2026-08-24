import { describe, expect, it } from "vitest";
import { buildChunkManifest, chunkRows } from "../scripts/static-site-data.mjs";

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
});
