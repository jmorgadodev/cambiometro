import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readR2EvidenceRecords } from "@/lib/r2-records";

afterEach(() => vi.unstubAllGlobals());

describe("archivo histórico en R2", () => {
  it("pagina InfoLobby desde el índice de rangos sin inflar el archivo completo", async () => {
    const records = [
      { id: "infolobby-2", sourceId: "infolobby", kind: "lobby", occurredAt: "2026-07-02", evidence: { sourceUrl: "https://infolobby.test/2" }, data: { organismo: "Ministerio de Salud", sujeto_pasivo: "Ana Pérez" } },
      { id: "infolobby-1", sourceId: "infolobby", kind: "lobby", occurredAt: "2026-07-01", evidence: { sourceUrl: "https://infolobby.test/1" }, data: { organismo: "Presidencia de la República", sujeto_pasivo: "Luis Soto" } },
    ];
    const archive = new TextEncoder().encode(records.map((record) => `${JSON.stringify(record)}\n`).join("")).buffer;
    const firstLength = new TextEncoder().encode(`${JSON.stringify(records[0])}\n`).byteLength;
    const objects = new Map<string, ArrayBuffer>([
      ["indexes/v1/infolobby/manifest.json", new TextEncoder().encode(JSON.stringify({ schemaVersion: 1, sourceId: "infolobby", totalRows: 2, pageSize: 1, recordArchiveKey: "indexes/v1/infolobby/records.jsonl", searchIndexKey: "indexes/v1/infolobby/search.json", pages: [{ offset: 0, length: firstLength }, { offset: firstLength, length: archive.byteLength - firstLength }] })).buffer],
      ["indexes/v1/infolobby/records.jsonl", archive],
      ["indexes/v1/infolobby/search.json", new TextEncoder().encode(JSON.stringify({ presidencia: [1], ministerio: [0] })).buffer],
    ]);
    const bucket: Parameters<typeof readR2EvidenceRecords>[0] = {
      async get(key, options) {
        const value = objects.get(key);
        if (!value) return null;
        const bytes = new Uint8Array(value);
        const range = options?.range;
        const sliced = range ? bytes.slice(range.offset, range.offset + range.length).buffer : value;
        return { json: async <T>() => JSON.parse(new TextDecoder().decode(sliced)) as T, arrayBuffer: async () => sliced };
      },
    };

    const result = await readR2EvidenceRecords(bucket, { source: "infolobby", query: "presidencia", limit: 10 });

    expect(result).toMatchObject({ total: 1, limit: 10 });
    expect(result?.data[0]).toMatchObject({ id: "infolobby-1", sourceId: "infolobby" });
  });

  it("no consulta el repositorio retirado cuando falta una partición en R2", async () => {
    const lakeRecord = {
      id: "contraloria-audit-1",
      sourceId: "contraloria",
      kind: "audit",
      occurredAt: "2026-01-10",
      evidence: { sourceUrl: "https://www.contraloria.cl/informe/1" },
      data: { title: "Informe oficial 1", report_number: "1/2026" },
    };
    const compressed = gzipSync(`${JSON.stringify(lakeRecord)}\n`);
    const checksum = createHash("sha256").update(compressed).digest("hex");
    const catalog = {
      schemaVersion: "1.0.0",
      generatedAt: "2026-08-08T00:00:00Z",
      sources: [],
      partitions: [{
        id: "contraloria/2026/01",
        sourceId: "contraloria",
        period: "2026-01",
        manifestKey: "partitions/contraloria/2026/01/manifest.json",
        checksumSha256: checksum,
        releaseTag: "data-contraloria-2026",
        recordCount: 1,
        status: "partial",
      }],
    };
    const bucket: Parameters<typeof readR2EvidenceRecords>[0] = {
      async get(key) {
        if (key === "catalog/v1/manifest.json") {
          return { json: async <T>() => catalog as T, arrayBuffer: async () => new ArrayBuffer(0) };
        }
        return null;
      },
    };
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await readR2EvidenceRecords(bucket, { source: "contraloria", limit: 10 });

    expect(result).toMatchObject({ data: [], total: 0, loadedRows: 0, expectedTotal: 1, complete: false, missingPartitions: 1, missingArtifacts: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rechaza un artefacto cuyo checksum no coincide", async () => {
    const compressed = gzipSync("{}\n");
    const manifestKey = "partitions/x/2026/01/manifest.json";
    const artifactKey = "partitions/x/2026/01/records.jsonl.gz";
    const manifest = {
      projectionChecksumSha256: "0".repeat(64),
      artifacts: [{ key: artifactKey, checksumSha256: "0".repeat(64), releaseAssetName: "x-2026-01-records.jsonl.gz" }],
    };
    const objects = new Map<string, ArrayBuffer>([
      ["catalog/v1/manifest.json", new TextEncoder().encode(JSON.stringify({ generatedAt: null, sources: [], partitions: [{ sourceId: "x", period: "2026-01", manifestKey, releaseTag: "data-x-2026", recordCount: 1 }] })).buffer],
      [manifestKey, new TextEncoder().encode(JSON.stringify(manifest)).buffer],
      [artifactKey, compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength)],
    ]);
    const bucket: Parameters<typeof readR2EvidenceRecords>[0] = {
      async get(key) {
        const value = objects.get(key);
        if (!value) return null;
        return { json: async <T>() => JSON.parse(new TextDecoder().decode(value)) as T, arrayBuffer: async () => value };
      },
    };

    await expect(readR2EvidenceRecords(bucket, { source: "x", limit: 10 })).rejects.toThrow("ARCHIVE_CHECKSUM_MISMATCH");
  });

  it("no publica una partición parcialmente cargada cuando falta uno de sus fragmentos", async () => {
    const first = gzipSync(`${JSON.stringify({
      id: "camara-partial-1",
      sourceId: "camara",
      kind: "vote",
      occurredAt: "2026-08-01",
      evidence: { sourceUrl: "https://opendata.camara.cl/votacion/1" },
      data: { title: "Primera parte" },
    })}\n`);
    const firstChecksum = createHash("sha256").update(first).digest("hex");
    const secondChecksum = "b".repeat(64);
    const prefix = "partitions/camara/2026/08";
    const firstKey = `${prefix}/records-${firstChecksum}.jsonl.gz.part-0001`;
    const secondKey = `${prefix}/records-${secondChecksum}.jsonl.gz.part-0002`;
    const manifest = {
      projectionChecksumSha256: "c".repeat(64),
      artifacts: [
        { key: firstKey, checksumSha256: firstChecksum, releaseAssetName: "camara-2026-08-records.jsonl.gz.part-0001" },
        { key: secondKey, checksumSha256: secondChecksum, releaseAssetName: "camara-2026-08-records.jsonl.gz.part-0002" },
      ],
    };
    const catalog = {
      schemaVersion: "1.0.0",
      generatedAt: "2026-09-11T00:00:00Z",
      sources: [],
      partitions: [{
        id: "camara/2026/08",
        sourceId: "camara",
        period: "2026-08",
        manifestKey: `${prefix}/manifest.json`,
        releaseTag: "data-camara-2026",
        recordCount: 2,
        checksumSha256: manifest.projectionChecksumSha256,
        status: "partial",
      }],
    };
    const objects = new Map<string, ArrayBuffer>([
      ["catalog/v1/manifest.json", new TextEncoder().encode(JSON.stringify(catalog)).buffer],
      [`${prefix}/manifest.json`, new TextEncoder().encode(JSON.stringify(manifest)).buffer],
      [firstKey, first.buffer.slice(first.byteOffset, first.byteOffset + first.byteLength)],
    ]);
    const bucket: Parameters<typeof readR2EvidenceRecords>[0] = {
      async get(key) {
        const value = objects.get(key);
        if (!value) return null;
        return { json: async <T>() => JSON.parse(new TextDecoder().decode(value)) as T, arrayBuffer: async () => value };
      },
    };

    const result = await readR2EvidenceRecords(bucket, { source: "camara", limit: 10 });

    expect(result).toMatchObject({ data: [], total: 0, loadedRows: 0, expectedTotal: 2, complete: false, missingPartitions: 1, missingArtifacts: 1 });
  });

  it("combina evidencia de varias fuentes para una entidad canónica", async () => {
    const files = new Map<string, Uint8Array>();
    const partitions = ["infoprobidad", "chilecompra"].map((sourceId, index) => {
      const record = { id: `${sourceId}-record`, sourceId, kind: index ? "contract" : "declaration", occurredAt: `2026-0${index + 1}-01`, evidence: { sourceUrl: `https://${sourceId}.test` }, data: { title: sourceId, subject_entity_ids: ["legal-cl-1"] } };
      const compressed = gzipSync(`${JSON.stringify(record)}\n`);
      const checksum = createHash("sha256").update(compressed).digest("hex");
      const prefix = `partitions/${sourceId}/2026/0${index + 1}`;
      const artifactKey = `${prefix}/records.jsonl.gz`;
      files.set(artifactKey, compressed);
      files.set(`${prefix}/manifest.json`, Buffer.from(JSON.stringify({ projectionChecksumSha256: checksum, artifacts: [{ key: artifactKey, checksumSha256: checksum, releaseAssetName: `${sourceId}-records.jsonl.gz` }] })));
      return { sourceId, period: `2026-0${index + 1}`, manifestKey: `${prefix}/manifest.json`, releaseTag: `data-${sourceId}-2026` };
    });
    const catalog = { generatedAt: "2026-08-08T00:00:00Z", sources: [], partitions };
    const bucket: Parameters<typeof readR2EvidenceRecords>[0] = {
      async get(key) {
        if (key === "catalog/v1/manifest.json") return { json: async <T>() => catalog as T, arrayBuffer: async () => new ArrayBuffer(0) };
        const bytes = files.get(key);
        return bytes ? { json: async <T>() => JSON.parse(new TextDecoder().decode(bytes)) as T, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer } : null;
      },
    };

    const result = await readR2EvidenceRecords(bucket, { source: ["infoprobidad", "chilecompra"], entityId: "legal-cl-1", limit: 10 });

    expect(result?.data.map((record) => record.sourceId).sort()).toEqual(["chilecompra", "infoprobidad"]);
  });
});
