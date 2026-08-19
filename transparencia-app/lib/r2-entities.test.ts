import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { readR2Entity, readR2EntityIndex } from "@/lib/r2-entities";

function object(data: string | Buffer) {
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return { async json<T>() { return JSON.parse(bytes.toString("utf8")) as T; }, async arrayBuffer() { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer; } };
}

describe("fichas e índices canónicos en R2", () => {
  it("encuentra entidad y evidencia por ID oficial", async () => {
    const files = new Map([
      ["catalog/v1/manifest.json", object(JSON.stringify({ sources: [{ id: "ley-19862", entityKey: "entities/v1/ley.jsonl.gz", entityIndexKey: "indexes/v1/ley.jsonl.gz" }], partitions: [] }))],
      ["entities/v1/ley.jsonl.gz", object(gzipSync('{"id":"legal-cl-1","kind":"legal_entity","name":"Entidad","identifiers":[],"attributes":{},"sourceIds":["ley-19862"],"updatedAt":null}\n'))],
      ["indexes/v1/ley.jsonl.gz", object(gzipSync('{"id":"legal-cl-1","sourceId":"ley-19862","evidenceRecordIds":["record-1"],"relations":[]}\n'))],
    ]);
    const bucket = { async get(key: string) { return files.get(key) ?? null; } };
    expect(await readR2Entity(bucket, "legal-cl-1")).toMatchObject({ name: "Entidad" });
    expect(await readR2EntityIndex(bucket, "legal-cl-1")).toMatchObject({ evidenceRecordIds: ["record-1"] });
  });

  it("fusiona la misma entidad y sus relaciones entre todas las fuentes", async () => {
    const relationA = { id: "relation-a", fromId: "person-1", predicate: "declared_legal_interest", toId: "legal-cl-1", evidenceRecordIds: ["record-a"], period: { from: "2026-01-01", to: "2026-01-01" }, reconciliation: { method: "official_declaration_json", confidence: 1 }, disclaimer: "documental" };
    const relationB = { id: "relation-b", fromId: "public-body-1", predicate: "contracted_with", toId: "legal-cl-1", evidenceRecordIds: ["record-b"], period: { from: "2026-02-01", to: "2026-02-01" }, reconciliation: { method: "official_id", confidence: 1 }, disclaimer: "documental" };
    const files = new Map([
      ["catalog/v1/manifest.json", object(JSON.stringify({ sources: [
        { id: "infoprobidad", entityKey: "entities/probidad.gz", entityIndexKey: "indexes/probidad.gz" },
        { id: "chilecompra", entityKey: "entities/compras.gz", entityIndexKey: "indexes/compras.gz" },
      ], partitions: [] }))],
      ["entities/probidad.gz", object(gzipSync('{"id":"legal-cl-1","kind":"legal_entity","name":"EMPRESA UNO SPA","identifiers":[{"scheme":"CL-RUT","value":"1","isPublic":true,"sourceUrl":"a"}],"attributes":{"country":"CL"},"sourceIds":["infoprobidad"],"updatedAt":"2026-01-01"}\n'))],
      ["entities/compras.gz", object(gzipSync('{"id":"legal-cl-1","kind":"supplier","name":"Empresa Uno","identifiers":[{"scheme":"CL-MP","value":"20","isPublic":true,"sourceUrl":"b"}],"attributes":{"country":"CL"},"sourceIds":["chilecompra"],"updatedAt":"2026-02-01"}\n'))],
      ["indexes/probidad.gz", object(gzipSync(`${JSON.stringify({ id: "legal-cl-1", sourceId: "infoprobidad", evidenceRecordIds: ["record-a"], relations: [relationA] })}\n`))],
      ["indexes/compras.gz", object(gzipSync(`${JSON.stringify({ id: "legal-cl-1", sourceId: "chilecompra", evidenceRecordIds: ["record-b"], relations: [relationB] })}\n`))],
    ]);
    const bucket = { async get(key: string) { return files.get(key) ?? null; } };

    expect(await readR2Entity(bucket, "legal-cl-1")).toMatchObject({
      kind: "legal_entity",
      sourceIds: ["chilecompra", "infoprobidad"],
      updatedAt: "2026-02-01",
    });
    const index = await readR2EntityIndex(bucket, "legal-cl-1");
    expect(index).toMatchObject({ sourceId: "multiple", sourceIds: ["chilecompra", "infoprobidad"], evidenceRecordIds: ["record-a", "record-b"] });
    expect(index?.relations.map((relation) => relation.id)).toEqual(["relation-a", "relation-b"]);
  });

  it("consulta sólo la fuente correspondiente cuando el ID es específico", async () => {
    const requested: string[] = [];
    const files = new Map([
      ["catalog/v1/manifest.json", object(JSON.stringify({ sources: [
        { id: "camara", entityKey: "entities/camara.gz", entityIndexKey: "indexes/camara.gz" },
        { id: "infoprobidad", entityKey: "entities/probidad.gz", entityIndexKey: "indexes/probidad.gz" },
      ], partitions: [] }))],
      ["entities/camara.gz", object(gzipSync('{"id":"person-camara-1009","kind":"person","name":"Diputado","identifiers":[],"attributes":{},"sourceIds":["camara"],"updatedAt":null}\n'))],
      ["indexes/camara.gz", object(gzipSync('{"id":"person-camara-1009","sourceId":"camara","evidenceRecordIds":[],"relations":[]}\n'))],
    ]);
    const bucket = { async get(key: string) { requested.push(key); return files.get(key) ?? null; } };

    expect(await readR2Entity(bucket, "person-camara-1009")).toMatchObject({ name: "Diputado" });
    expect(await readR2EntityIndex(bucket, "person-camara-1009")).toMatchObject({ sourceId: "camara" });
    expect(requested).not.toContain("entities/probidad.gz");
    expect(requested).not.toContain("indexes/probidad.gz");
  });
});
