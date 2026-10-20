import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { buildLakePlan } from "../scripts/etl/lake.mjs";
import { buildDeterministicPartition, stableStringify } from "../scripts/etl/core.mjs";
import { buildChileCompraRestorePlan, JULY_CANDIDATE, verifyChileCompraHistoryArchives } from "../scripts/restore-chilecompra-candidate.mjs";

const sha256 = (data: Buffer) => createHash("sha256").update(data).digest("hex");
const jsonl = (data: Buffer): Array<Record<string, unknown>> => gunzipSync(data).toString("utf8").trim().split("\n").map(line => JSON.parse(line));

function fixture() {
  const raw = (id: string, month: string, buyer: string) => ({
    id, fecha: `2026-${month}-12`, source_period: `2026-${month}`, kind: "purchase",
    url: `https://api.mercadopublico.cl/tender/${id}`,
    buyer: { id: buyer, name: "Mismo nombre oficial" }, suppliers: [],
  });
  const baseline = buildLakePlan({ actualizado_en: "2026-09-01T00:00:00Z", fuentes: {
    chilecompra: [raw("old-1", "06", "CL-MP-1"), raw("old-2", "06", "CL-MP-2")],
    dipres: [{ id: "budget-current", fecha: "2026-08-01" }],
  } });
  // Exercise legacy June metadata: the generic builder would discard this partition.
  const june = baseline.catalog.partitions.find(p => p.sourceId === "chilecompra")!;
  delete june.sourcePeriod;
  const currentSource = baseline.catalog.sources.find(s => s.id === "chilecompra")!;
  const existingEntityBundle = {
    entities: jsonl(baseline.assets.find(a => a.key === currentSource.entityKey)!.data),
    indexes: jsonl(baseline.assets.find(a => a.key === currentSource.entityIndexKey)!.data),
    years: ["2026"],
  };
  const candidate = buildLakePlan({ actualizado_en: "2026-10-20T15:00:00Z", fuentes: {
    chilecompra: [raw("july-1", "07", "CL-MP-1"), raw("july-2", "07", "CL-MP-3")],
  } }, { originalAssets: [{
    sourceId: "chilecompra", year: 2026, month: 7,
    name: "chilecompra-2026-07-rejected-documents.json", url: "https://datos-abiertos.chilecompra.cl/descargas/procesos-ocds",
    license: "CC0-1.0", redistributable: true,
    data: Buffer.from(`${stableStringify({ count: 1, documents: [{ url: "https://api.mercadopublico.cl/invalid", reason: "CHILECOMPRA_INVALID_PACKAGE_SCHEMA" }] })}\n`),
  }] });
  const records = candidate.assets.find(a => a.key.startsWith("partitions/") && a.key.endsWith(".jsonl.gz"))!;
  const manifest = candidate.assets.find(a => a.key.startsWith("partitions/") && a.key.endsWith("manifest.json"))!;
  const rejected = candidate.assets.find(a => a.key.startsWith("originals/"))!;
  const metadata = (a: typeof records) => ({ name: a.releaseAssetName, size: a.size, sha256: a.checksumSha256 });
  return {
    files: { records: records.data, manifest: manifest.data, rejected: rejected.data },
    expected: {
      period: "2026-07", recordCount: 2, releaseTag: manifest.releaseTag,
      records: metadata(records), manifest: metadata(manifest), rejected: metadata(rejected),
      uncompressedSha256: sha256(gunzipSync(records.data)),
    },
    existingCatalog: baseline.catalog, existingEntityBundle,
    generatedAt: "2026-10-20T17:00:00Z",
  };
}

describe("restauración local del candidato ChileCompra preservado", () => {
  it("fija los tres assets de julio y las 65.609 filas sin permitir override por CLI", () => {
    expect(JULY_CANDIDATE).toMatchObject({
      period: "2026-07", recordCount: 65609, releaseTag: "data-chilecompra-2026-d39dd8ee32c5c073",
      records: { name: "chilecompra-2026-07-records.jsonl.gz", size: 12080577, sha256: "e500ac4d3d63f002a8b430e24485930628c04b4d732dbf5b91bc2e4372376deb" },
      manifest: { name: "chilecompra-2026-07-manifest.json", size: 1371, sha256: "d39dd8ee32c5c0731088d37898ce176154c62c3713c78bdf016ff6f79937df4d" },
      rejected: { size: 1052, sha256: "80987d41b77cbcbd9bd24d6015f84ffea96fc63fd748f8a5fcd9b55d79588f63" },
    });
  });

  it("parte del catálogo vigente, conserva junio/otros dominios y restaura los bytes exactos de julio", () => {
    const input = fixture();
    const before = structuredClone(input.existingCatalog);
    const plan = buildChileCompraRestorePlan(input);
    expect(input.existingCatalog).toEqual(before);
    for (const partition of before.partitions) expect(plan.catalog.partitions).toContainEqual(partition);
    expect(plan.catalog.sources.find(s => s.id === "dipres")).toEqual(before.sources.find(s => s.id === "dipres"));
    const restored = plan.catalog.partitions.find(p => p.id === "chilecompra/2026/07")!;
    expect(restored).toMatchObject({ recordCount: 2, checksumSha256: input.expected.records.sha256, releaseTag: input.expected.releaseTag });
    expect(plan.assets.find(a => a.key === `partitions/chilecompra/2026/07/records-${input.expected.records.sha256}.jsonl.gz`)!.data).toEqual(input.files.records);
    expect(plan.assets.find(a => a.key === restored.manifestKey)!.data).toEqual(input.files.manifest);
    expect(plan.assets.find(a => a.key.startsWith("originals/"))!.data).toEqual(input.files.rejected);
    expect(plan.assets.every(a => !a.key.includes("dipres") && !a.key.startsWith("partitions/chilecompra/2026/06/"))).toBe(true);
    const catalogAsset = plan.assets.find(a => a.key === "catalog/v1/manifest.json")!;
    expect(JSON.parse(catalogAsset.data.toString("utf8"))).toEqual(plan.catalog);
    expect(catalogAsset.checksumSha256).toBe(sha256(catalogAsset.data));
    const sourceManifest = JSON.parse(plan.assets.find(a => a.key === "sources/chilecompra/manifest.json")!.data.toString("utf8"));
    expect(sourceManifest).toMatchObject({ recordCount: 4, partitionCount: 2, entityCount: 3 });
    expect(sourceManifest.partitions.map((p: { id: string }) => p.id)).toEqual(["chilecompra/2026/06", "chilecompra/2026/07"]);
  });

  it("une entidades por ID oficial, conserva identidades homónimas y evidencia histórica", () => {
    const input = fixture();
    const plan = buildChileCompraRestorePlan(input);
    const source = plan.catalog.sources.find(s => s.id === "chilecompra")!;
    const entities = jsonl(plan.assets.find(a => a.key === source.entityKey)!.data);
    const indexes = jsonl(plan.assets.find(a => a.key === source.entityIndexKey)!.data);
    expect(entities.map(e => e.id)).toEqual(["chilecompra-cl-mp-1", "chilecompra-cl-mp-2", "chilecompra-cl-mp-3"]);
    expect(entities.every(e => e.name === "Mismo nombre oficial")).toBe(true);
    expect(source).toMatchObject({ entityCount: 3, recordCount: 4 });
    expect(indexes.find(e => e.id === "chilecompra-cl-mp-1")!.evidenceRecordIds).toEqual(["chilecompra-july-1", "chilecompra-old-1"]);
    expect(indexes.find(e => e.id === "chilecompra-cl-mp-2")).toEqual(input.existingEntityBundle.indexes.find(e => e.id === "chilecompra-cl-mp-2"));
    const again = buildChileCompraRestorePlan({ ...input, existingCatalog: plan.catalog, existingEntityBundle: { entities, indexes, years: ["2026"] } });
    expect(again.catalog).toEqual(plan.catalog);
    expect(again.assets.map(a => a.checksumSha256)).toEqual(plan.assets.map(a => a.checksumSha256));
  });

  it.each(["records", "manifest", "rejected"] as const)("rechaza digest o tamaño incorrectos: %s", (key) => {
    const input = fixture();
    input.files[key] = Buffer.concat([input.files[key], Buffer.from(" ")]);
    expect(() => buildChileCompraRestorePlan(input)).toThrow(/CANDIDATE_ASSET/);
    input.expected[key].size = input.files[key].length;
    expect(() => buildChileCompraRestorePlan(input)).toThrow(/CANDIDATE_ASSET/);
  });

  it.each([
    ["sourceId", "dipres"], ["sourcePeriod", "2026-06"], ["recordCount", 3],
    ["projectionChecksumSha256", "f".repeat(64)],
  ])("rechaza un manifiesto incompatible: %s", (key, value) => {
    const input = fixture();
    const manifest = JSON.parse(input.files.manifest.toString("utf8"));
    manifest[key] = value;
    input.files.manifest = Buffer.from(`${stableStringify(manifest)}\n`);
    input.expected.manifest = { ...input.expected.manifest, size: input.files.manifest.length, sha256: sha256(input.files.manifest) };
    input.expected.releaseTag = `data-chilecompra-2026-${input.expected.manifest.sha256.slice(0, 16)}`;
    expect(() => buildChileCompraRestorePlan(input)).toThrow(/CANDIDATE_MANIFEST/);
  });

  it("rechaza pérdida de entidades o índices históricos y conflictos con un julio ya publicado", () => {
    const input = fixture();
    expect(() => buildChileCompraRestorePlan({ ...input, existingEntityBundle: { ...input.existingEntityBundle, entities: [] } })).toThrow(/HISTORY/);
    expect(() => buildChileCompraRestorePlan({ ...input, existingEntityBundle: { ...input.existingEntityBundle, indexes: [] } })).toThrow(/HISTORY/);
    input.existingCatalog.partitions.push({ ...input.existingCatalog.partitions[0], id: "chilecompra/2026/07", sourceId: "chilecompra", period: "2026-07", checksumSha256: "different" });
    expect(() => buildChileCompraRestorePlan(input)).toThrow(/TARGET_CONFLICT/);
  });

  it("verifica SHA y conteo del archivo histórico contra el catálogo vigente, y rechaza otro conjunto de IDs", () => {
    const input = fixture();
    const entityArchive = buildDeterministicPartition(input.existingEntityBundle.entities as Array<{ id: string }>).compressed;
    const entityIndexArchive = buildDeterministicPartition(input.existingEntityBundle.indexes as Array<{ id: string }>).compressed;
    const history = { existingCatalog: input.existingCatalog, entityArchive, entityIndexArchive };
    expect(verifyChileCompraHistoryArchives(history).entities).toEqual(input.existingEntityBundle.entities);
    expect(() => verifyChileCompraHistoryArchives({ ...history, entityArchive: Buffer.concat([entityArchive, Buffer.from(" ")]) })).toThrow(/HISTORY_CHECKSUM/);
    expect(() => verifyChileCompraHistoryArchives({ ...history, entityIndexArchive: Buffer.concat([entityIndexArchive, Buffer.from(" ")]) })).toThrow(/HISTORY_CHECKSUM/);
    const source = input.existingCatalog.sources.find(s => s.id === "chilecompra")!;
    const originalCount = Number(source.entityCount);
    source.entityCount = originalCount + 1;
    expect(() => verifyChileCompraHistoryArchives(history)).toThrow(/HISTORY_ENTITY_COUNT/);
    source.entityCount = originalCount;
    const otherIds = buildDeterministicPartition(input.existingEntityBundle.entities.map((e, i) => ({ ...e, id: `unrelated-${i}` }))).compressed;
    expect(() => verifyChileCompraHistoryArchives({ ...history, entityArchive: otherIds })).toThrow(/HISTORY_CHECKSUM/);
    source.entityKey = `entities/v1/chilecompra-${sha256(otherIds)}.jsonl.gz`;
    expect(() => verifyChileCompraHistoryArchives({ ...history, entityArchive: otherIds })).toThrow(/HISTORY_INDEX/);
  });

  it.each(["source", "period", "duplicate"])("rechaza filas incompatibles aunque los checksums concuerden: %s", (problem) => {
    const input = fixture();
    const records = jsonl(input.files.records) as Array<{ id: string; sourceId: string; data: { source_period: string } }>;
    if (problem === "source") records[0].sourceId = "dipres";
    if (problem === "period") records[0].data.source_period = "2026-06";
    if (problem === "duplicate") records[1] = records[0];
    const projection = buildDeterministicPartition(records);
    input.files.records = projection.compressed;
    input.expected.records = { ...input.expected.records, size: projection.compressed.length, sha256: projection.checksumSha256 };
    input.expected.uncompressedSha256 = projection.uncompressedChecksumSha256;
    const manifest = JSON.parse(input.files.manifest.toString("utf8"));
    manifest.projectionChecksumSha256 = projection.checksumSha256;
    manifest.projectionUncompressedChecksumSha256 = projection.uncompressedChecksumSha256;
    manifest.artifacts[0] = { ...manifest.artifacts[0],
      key: `partitions/chilecompra/2026/07/records-${projection.checksumSha256}.jsonl.gz`,
      size: projection.compressed.length, checksumSha256: projection.checksumSha256,
    };
    input.files.manifest = Buffer.from(`${stableStringify(manifest)}\n`);
    input.expected.manifest = { ...input.expected.manifest, size: input.files.manifest.length, sha256: sha256(input.files.manifest) };
    input.expected.releaseTag = `data-chilecompra-2026-${input.expected.manifest.sha256.slice(0, 16)}`;
    expect(() => buildChileCompraRestorePlan(input)).toThrow(/CANDIDATE_ROWS_INVALID/);
  });

  it("exige el índice histórico y no admite sustituir los pins desde CLI", () => {
    const script = fileURLToPath(new URL("../scripts/restore-chilecompra-candidate.mjs", import.meta.url));
    const missingIndex = spawnSync(process.execPath, [script, "--candidate-dir", "missing", "--base-entities", "missing", "--lake-root", "missing"], { encoding: "utf8" });
    expect(missingIndex.status).not.toBe(0);
    expect(missingIndex.stderr).toContain("CHILECOMPRA_RESTORE_ARGUMENT_REQUIRED:--base-entity-index");
    const override = spawnSync(process.execPath, [script, "--expected", "alternative"], { encoding: "utf8" });
    expect(override.status).not.toBe(0);
    expect(override.stderr).toContain("CHILECOMPRA_RESTORE_ARGUMENT_INVALID:--expected");
  });
});
