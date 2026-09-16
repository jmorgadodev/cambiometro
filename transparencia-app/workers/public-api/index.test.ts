import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import worker, { listRecordsFromR2 } from "./index";

function r2Object(value: unknown) {
  if (value instanceof ArrayBuffer) {
    return {
      json: async <T>() => JSON.parse(new TextDecoder().decode(new Uint8Array(value))) as T,
      arrayBuffer: async () => value,
    };
  }
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

function gzipJsonl(records: unknown[]) {
  const data = gzipSync(`${records.map((record) => JSON.stringify(record)).join("\n")}\n`);
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

function sha256(data: ArrayBuffer) {
  return createHash("sha256").update(Buffer.from(data)).digest("hex");
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

  it("respeta period en una consulta pública de gastos de Senado", async () => {
    const january = gzipJsonl([{ id: "senado-expense-jan", sourceId: "gastos_senado", kind: "expense", occurredAt: "2026-01-15", data: { title: "Enero" } }]);
    const february = gzipJsonl([{ id: "senado-expense-feb", sourceId: "gastos_senado", kind: "expense", occurredAt: "2026-02-15", data: { title: "Febrero" } }]);
    const januaryPartition = {
      sourceId: "gastos_senado", period: "2026-01", recordCount: 1,
      manifestKey: "partitions/gastos_senado/2026/01/manifest.json", checksumSha256: "jan", releaseTag: "test",
      manifest: { projectionChecksumSha256: "projection", artifacts: [{ key: "partitions/gastos_senado/2026/01/records.jsonl.gz", checksumSha256: sha256(january), releaseAssetName: "jan" }] },
    };
    const februaryPartition = {
      sourceId: "gastos_senado", period: "2026-02", recordCount: 1,
      manifestKey: "partitions/gastos_senado/2026/02/manifest.json", checksumSha256: "feb", releaseTag: "test",
      manifest: { projectionChecksumSha256: "projection", artifacts: [{ key: "partitions/gastos_senado/2026/02/records.jsonl.gz", checksumSha256: sha256(february), releaseAssetName: "feb" }] },
    };
    const bucket = fakeBucket({
      "catalog/v1/manifest.json": { generatedAt: "2026-09-12T00:00:00Z", partitions: [januaryPartition, februaryPartition] },
      [januaryPartition.manifestKey]: januaryPartition.manifest,
      [februaryPartition.manifestKey]: februaryPartition.manifest,
      "partitions/gastos_senado/2026/01/records.jsonl.gz": january,
      "partitions/gastos_senado/2026/02/records.jsonl.gz": february,
    });

    const response = await listRecordsFromR2(
      new URL("https://example.test/api/v1/records?source=gastos_senado&kind=expense&period=2026-01&limit=10"),
      { PUBLIC_DATA: bucket as never },
    );
    const payload = await response!.json() as { data: Array<{ id: string }>; meta: Record<string, unknown> };

    expect(response!.status).toBe(200);
    expect(payload.meta.total).toBe(1);
    expect(payload.data.map((row) => row.id)).toEqual(["senado-expense-jan"]);
  });

  it("respeta period en la proyección compacta de gastos", async () => {
    const bucket = fakeBucket({
      "projections/static-site-v1/manifest.json": {
        files: [{ path: "data/lake-subsets/gastos-senado.subset.json", key: "subsets/gastos-senado.json" }],
      },
      "subsets/gastos-senado.json": {
        sourceId: "gastos_senado",
        generatedAt: "2026-09-12T00:00:00Z",
        records: [
          { id: "expense-jan", fecha: "2026-01-15", periodo: "2026-01", nombre: "Senador Enero", item: "ITEM", monto_clp: 1, url: "https://example.test/jan", fuente: "Senado" },
          { id: "expense-feb", fecha: "2026-02-15", periodo: "2026-02", nombre: "Senador Febrero", item: "ITEM", monto_clp: 2, url: "https://example.test/feb", fuente: "Senado" },
        ],
      },
    });

    const response = await worker.fetch(
      new Request("https://example.test/api/v1/records?source=gastos_senado&kind=expense&period=2026-01&limit=10"),
      { PUBLIC_DATA: bucket as never } as never,
    );
    const payload = await response.json() as { data: Array<{ id: string }>; meta: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(payload.meta.total).toBe(1);
    expect(payload.data.map((row) => row.id)).toEqual(["expense-jan"]);
  });

  it("omite palabras vacías nacionales y consulta ambas nóminas sin cargar su shard gigante", async () => {
    const municipalVersion = "municipal-test";
    const centralVersion = "central-test";
    const municipalManifest = {
      version: municipalVersion,
      generatedAt: "2026-09-15T00:00:00Z",
      assets: [],
      searchIndex: { key: `projections/funcionarios-v1/versions/${municipalVersion}/search_index.json` },
    };
    const centralManifest = {
      version: centralVersion,
      generatedAt: "2026-09-15T00:00:00Z",
      assets: [],
      searchIndex: { key: `projections/funcionarios-central-v1/versions/${centralVersion}/search_index.json` },
    };
    const makeIndex = (root: string, version: string, rowKey: string) => ({
      totalRows: 1,
      pageSize: 10,
      pages: [{ page: 1, key: `${root}/versions/${version}/search_index/p-0001.json`, count: 1 }],
      shards: { lu: `${root}/versions/${version}/search_index/lu-001.json` },
      filters: {},
      rowKey,
    });
    const municipalIndex = makeIndex("projections/funcionarios-v1", municipalVersion, "municipal-row");
    const centralIndex = makeIndex("projections/funcionarios-central-v1", centralVersion, "central-row");
    const bucket = fakeBucket({
      "projections/funcionarios-v1/manifest.json": municipalManifest,
      "projections/funcionarios-central-v1/manifest.json": centralManifest,
      [municipalManifest.searchIndex.key]: municipalIndex,
      [centralManifest.searchIndex.key]: centralIndex,
      "projections/funcionarios-v1/versions/municipal-test/search_index/lu-001.json": [["lucy", [0]]],
      "projections/funcionarios-central-v1/versions/central-test/search_index/lu-001.json": [["lucy", [0]]],
      "projections/funcionarios-v1/versions/municipal-test/search_index/p-0001.json": [{ id: "municipal-row", n: "Lucy Depablos Chacon", c: "Asesora", o: "Municipalidad" }],
      "projections/funcionarios-central-v1/versions/central-test/search_index/p-0001.json": [{ id: "central-row", n: "Lucy Depablos Chacon", c: "Asesora", o: "Servicio público" }],
    });

    const response = await worker.fetch(
      new Request("https://example.test/api/funcionarios?scope=all&query=Lucy%20de&include_zero=true&limit=20"),
      { PUBLIC_DATA: bucket as never } as never,
    );
    const payload = await response.json() as { data: Array<{ id: string }>; meta: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(payload.meta.total).toBe(2);
    expect(payload.data.map((row) => row.id).sort()).toEqual(["central-row", "municipal-row"]);
    expect(bucket.requested.some((key) => key.includes("/de-"))).toBe(false);
  });

  it("no vuelve a leer la misma página R2 al combinar la primera página nacional", async () => {
    const municipalVersion = "municipal-first-page";
    const centralVersion = "central-first-page";
    const municipalManifest = {
      version: municipalVersion,
      generatedAt: "2026-09-15T00:00:00Z",
      assets: [],
      searchIndex: { key: `projections/funcionarios-v1/versions/${municipalVersion}/search_index.json` },
    };
    const centralManifest = {
      version: centralVersion,
      generatedAt: "2026-09-15T00:00:00Z",
      assets: [],
      searchIndex: { key: `projections/funcionarios-central-v1/versions/${centralVersion}/search_index.json` },
    };
    const makeIndex = (root: string, version: string, rowKey: string) => ({
      totalRows: 1,
      pageSize: 10,
      pages: [{ page: 1, key: `${root}/versions/${version}/search_index/p-0001.json`, count: 1 }],
      shards: { lu: `${root}/versions/${version}/search_index/lu-001.json` },
      filters: {},
      rowKey,
    });
    const municipalIndex = makeIndex("projections/funcionarios-v1", municipalVersion, "municipal-row");
    const centralIndex = makeIndex("projections/funcionarios-central-v1", centralVersion, "central-row");
    const bucket = fakeBucket({
      "projections/funcionarios-v1/manifest.json": municipalManifest,
      "projections/funcionarios-central-v1/manifest.json": centralManifest,
      [municipalManifest.searchIndex.key]: municipalIndex,
      [centralManifest.searchIndex.key]: centralIndex,
      "projections/funcionarios-v1/versions/municipal-first-page/search_index/lu-001.json": [["lucy", [0]]],
      "projections/funcionarios-central-v1/versions/central-first-page/search_index/lu-001.json": [["lucy", [0]]],
      "projections/funcionarios-v1/versions/municipal-first-page/search_index/p-0001.json": [{ id: "municipal-row", n: "Lucy Depablos Chacon", c: "Asesora", o: "Municipalidad" }],
      "projections/funcionarios-central-v1/versions/central-first-page/search_index/p-0001.json": [{ id: "central-row", n: "Lucy Depablos Chacon", c: "Asesora", o: "Servicio público" }],
    });

    const response = await worker.fetch(
      new Request("https://example.test/api/funcionarios?scope=all&query=Lucy&include_zero=true&limit=20&page=1"),
      { PUBLIC_DATA: bucket as never } as never,
    );

    expect(response.status).toBe(200);
    const counts = new Map<string, number>();
    for (const key of bucket.requested) counts.set(key, (counts.get(key) ?? 0) + 1);
    for (const key of [
      "projections/funcionarios-v1/manifest.json",
      municipalManifest.searchIndex.key,
      "projections/funcionarios-v1/versions/municipal-first-page/search_index/lu-001.json",
      "projections/funcionarios-v1/versions/municipal-first-page/search_index/p-0001.json",
      "projections/funcionarios-central-v1/manifest.json",
      centralManifest.searchIndex.key,
      "projections/funcionarios-central-v1/versions/central-first-page/search_index/lu-001.json",
      "projections/funcionarios-central-v1/versions/central-first-page/search_index/p-0001.json",
    ]) expect(counts.get(key)).toBe(1);
  });

  it("conserva la nómina municipal si la nómina central falla en una búsqueda combinada", async () => {
    const version = "municipal-only";
    const manifest = {
      version,
      generatedAt: "2026-09-15T00:00:00Z",
      assets: [],
      searchIndex: { key: `projections/funcionarios-v1/versions/${version}/search_index.json` },
    };
    const index = {
      totalRows: 1,
      pageSize: 10,
      pages: [{ page: 1, key: `projections/funcionarios-v1/versions/${version}/search_index/p-0001.json`, count: 1 }],
      shards: { lu: `projections/funcionarios-v1/versions/${version}/search_index/lu-001.json` },
      filters: {},
    };
    const bucket = fakeBucket({
      "projections/funcionarios-v1/manifest.json": manifest,
      [manifest.searchIndex.key]: index,
      [`projections/funcionarios-v1/versions/${version}/search_index/lu-001.json`]: [["lucy", [0]]],
      [`projections/funcionarios-v1/versions/${version}/search_index/p-0001.json`]: [{ id: "municipal-row", n: "Lucy Depablos Chacon", c: "Asesora", o: "Municipalidad" }],
    });

    const response = await worker.fetch(
      new Request("https://example.test/api/funcionarios?scope=all&query=Lucy&include_zero=true&limit=20"),
      { PUBLIC_DATA: bucket as never } as never,
    );
    const payload = await response.json() as { data: Array<{ id: string }>; meta: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(payload.data.map((row) => row.id)).toEqual(["municipal-row"]);
  });
});
