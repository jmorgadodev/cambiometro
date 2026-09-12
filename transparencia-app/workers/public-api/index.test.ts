import { describe, expect, it } from "vitest";
import { listRecordsFromR2 } from "./index";

function r2Object(value: unknown) {
  const encoded = new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value));
  return {
    json: async <T>() => JSON.parse(new TextDecoder().decode(encoded)) as T,
    arrayBuffer: async () => encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength),
  };
}

function fakeBucket(objects: Record<string, unknown>) {
  const requested: string[] = [];
  return {
    requested,
    get: async (key: string) => {
      requested.push(key);
      return Object.prototype.hasOwnProperty.call(objects, key) ? r2Object(objects[key]) : null;
    },
  };
}

describe("registros públicos R2", () => {
  it("consulta primero el índice paginado y evita cargar la proyección estática completa", async () => {
    const line = JSON.stringify({
      id: "chilecompra-1",
      sourceId: "chilecompra",
      kind: "contract",
      occurredAt: "2026-06-01",
      data: { title: "Orden de compra", monto_clp: 1000 },
    }) + "\n";
    const bucket = fakeBucket({
      "projections/static-site-v1/manifest.json": { files: [] },
      "catalog/v1/manifest.json": { sources: [{ id: "chilecompra", recordCount: 1 }] },
      "indexes/v1/chilecompra/manifest.json": {
        schemaVersion: 1,
        sourceId: "chilecompra",
        totalRows: 1,
        pageSize: 50,
        recordArchiveKey: "indexes/v1/chilecompra/records.jsonl",
        pages: [{ offset: 0, length: new TextEncoder().encode(line).byteLength }],
      },
      "indexes/v1/chilecompra/records.jsonl": line,
    });

    const response = await listRecordsFromR2(
      new URL("https://example.test/api/v1/records?source=chilecompra&limit=50"),
      { PUBLIC_DATA: bucket as never },
    );
    const payload = await response!.json() as { data: unknown[]; meta: Record<string, unknown> };

    expect(response!.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.meta.sourceBackend).toBe("r2-lake");
    expect(bucket.requested).not.toContain("projections/static-site-v1/manifest.json");
  });
});
