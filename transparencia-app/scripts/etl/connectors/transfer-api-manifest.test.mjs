import { describe, expect, it } from "vitest";
import {
  buildTransferApiManifest,
  buildTransferApiPublishSummary,
} from "../../transfer-api-manifest.mjs";

describe("manifiesto del release R2 de transferencias", () => {
  it("conserva los contadores del generador sin inferirlos del total publicado", () => {
    const generated = {
      schemaVersion: 1,
      dataset: "ley-19862-transferencias",
      generatedAt: "2026-09-08T13:21:08.102Z",
      registeredThrough: "2026-08-31",
      // Synthetic fixture values; they are not a reconciliation of production.
      sourceRows: 103,
      duplicateExactRows: 2,
      duplicateConflictingRows: 0,
      excludedAfterCutoff: 1,
      totalRows: 100,
      pageSize: 50,
      totalPages: 2,
      checksumSha256: "a".repeat(64),
      pages: [
        { page: 1, path: "/data/transferencias/p-0001.json", count: 50, sha256: "b".repeat(64) },
        { page: 2, path: "/data/transferencias/p-0002.json", count: 50, sha256: "c".repeat(64) },
      ],
      searchIndex: { path: "/data/transferencias/search-index.json", count: 100, sha256: "f".repeat(64) },
      expected: { totalMontoClp: 10_000, totalReceptores: 12, totalEmisores: 4 },
    };

    const published = buildTransferApiManifest(generated);

    expect(published).toMatchObject({
      sourceRows: 103,
      duplicateExactRows: 2,
      duplicateConflictingRows: 0,
      excludedAfterCutoff: 1,
      totalRows: 100,
      pages: expect.arrayContaining([
        expect.objectContaining({ key: `projections/transferencias-v1/releases/${"a".repeat(64)}/p-0001.json` }),
      ]),
      searchIndex: { key: `projections/transferencias-v1/releases/${"a".repeat(64)}/search-index.json` },
    });
  });

  it("deja contadores desconocidos como null en vez de inventar cero duplicados", () => {
    const published = buildTransferApiManifest({
      dataset: "ley-19862-transferencias",
      checksumSha256: "d".repeat(64),
      pages: [],
      searchIndex: {},
    });

    expect(published).toMatchObject({
      sourceRows: null,
      duplicateExactRows: null,
      duplicateConflictingRows: null,
      excludedAfterCutoff: null,
    });
  });

  it("incluye en el resumen del publicador la ruta calculada del release", () => {
    const manifest = {
      dataset: "ley-19862-transferencias",
      totalRows: 100,
      totalPages: 2,
      checksumSha256: "e".repeat(64),
      releasePrefix: `projections/transferencias-v1/releases/${"e".repeat(64)}`,
    };
    const summary = buildTransferApiPublishSummary({
      bucket: "transparencia-public-data",
      apiManifest: manifest,
      storageBudget: { currentBytes: 1, projectedBytes: 2, peakBytes: 3 },
    });

    expect(summary).toMatchObject({
      bucket: "transparencia-public-data",
      dataset: manifest.dataset,
      totalRows: 100,
      totalPages: 2,
      checksumSha256: manifest.checksumSha256,
      releasePrefix: manifest.releasePrefix,
      storageBudget: { currentBytes: 1, projectedBytes: 2, peakBytes: 3 },
    });
  });
});
