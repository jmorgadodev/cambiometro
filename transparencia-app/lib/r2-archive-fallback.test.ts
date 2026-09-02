import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readR2EvidenceRecords } from "@/lib/r2-records";

afterEach(() => vi.unstubAllGlobals());

describe("archivo histórico en GitHub Releases", () => {
  it("valida y recachea una partición fría ausente de R2", async () => {
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
    const manifest = {
      projectionChecksumSha256: checksum,
      artifacts: [{
        key: `partitions/contraloria/2026/01/records-${checksum}.jsonl.gz`,
        checksumSha256: checksum,
        releaseAssetName: "contraloria-2026-01-records.jsonl.gz",
      }],
    };
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
        status: "partial",
      }],
    };
    const cached = new Map<string, ArrayBuffer>();
    const bucket: Parameters<typeof readR2EvidenceRecords>[0] = {
      async get(key) {
        if (key === "catalog/v1/manifest.json") {
          return { json: async <T>() => catalog as T, arrayBuffer: async () => new ArrayBuffer(0) };
        }
        const data = cached.get(key);
        return data ? {
          json: async <T>() => JSON.parse(new TextDecoder().decode(data)) as T,
          arrayBuffer: async () => data,
        } : null;
      },
      async put(key, value) { cached.set(key, value); },
    };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("contraloria-2026-01-manifest.json")) return Response.json(manifest);
      if (url.endsWith("contraloria-2026-01-records.jsonl.gz")) return new Response(compressed);
      return new Response(null, { status: 404 });
    }));

    const result = await readR2EvidenceRecords(bucket, { source: "contraloria", limit: 10 });

    expect(result?.data).toHaveLength(1);
    expect(result?.data[0]).toMatchObject({ kind: "audit", title: "Informe oficial 1" });
    expect(cached.has("partitions/contraloria/2026/01/manifest.json")).toBe(true);
    expect(cached.has(`partitions/contraloria/2026/01/records-${checksum}.jsonl.gz`)).toBe(true);
  });

  it("rechaza un artefacto cuyo checksum no coincide", async () => {
    const compressed = gzipSync("{}\n");
    const manifest = {
      projectionChecksumSha256: "0".repeat(64),
      artifacts: [{ key: "partitions/x/2026/01/records.jsonl.gz", checksumSha256: "0".repeat(64), releaseAssetName: "x-2026-01-records.jsonl.gz" }],
    };
    const bucket: Parameters<typeof readR2EvidenceRecords>[0] = {
      async get(key) {
        if (key === "catalog/v1/manifest.json") return { json: async <T>() => ({ generatedAt: null, sources: [], partitions: [{ sourceId: "x", period: "2026-01", manifestKey: "partitions/x/2026/01/manifest.json", releaseTag: "data-x-2026" }] }) as T, arrayBuffer: async () => new ArrayBuffer(0) };
        return null;
      },
    };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => String(input).endsWith("manifest.json") ? Response.json(manifest) : new Response(compressed)));

    await expect(readR2EvidenceRecords(bucket, { source: "x", limit: 10 })).rejects.toThrow("ARCHIVE_CHECKSUM_MISMATCH");
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
