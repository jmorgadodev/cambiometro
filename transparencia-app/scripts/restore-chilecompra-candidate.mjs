import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { stableStringify } from "./etl/core.mjs";
import { buildLakePlan } from "./etl/lake.mjs";

// No extraction or remote publication: inputs are downloaded by the caller.
export const JULY_CANDIDATE = Object.freeze({
  period: "2026-07", recordCount: 65609,
  releaseTag: "data-chilecompra-2026-d39dd8ee32c5c073",
  uncompressedSha256: "2e528663a5bd18e5085c2639fbf43ddd98300e0f1d2bf4bb8ec0ad1c71ee6d97",
  records: Object.freeze({ name: "chilecompra-2026-07-records.jsonl.gz", size: 12080577, sha256: "e500ac4d3d63f002a8b430e24485930628c04b4d732dbf5b91bc2e4372376deb" }),
  manifest: Object.freeze({ name: "chilecompra-2026-07-manifest.json", size: 1371, sha256: "d39dd8ee32c5c0731088d37898ce176154c62c3713c78bdf016ff6f79937df4d" }),
  rejected: Object.freeze({ name: "chilecompra-2026-07-original-chilecompra-2026-07-rejected-documents.json", size: 1052, sha256: "80987d41b77cbcbd9bd24d6015f84ffea96fc63fd748f8a5fcd9b55d79588f63" }),
});

const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const parseJsonl = (data) => {
  const text = data.toString("utf8").trim();
  return text ? text.split("\n").map(line => JSON.parse(line)) : [];
};
const metadata = ({ key, checksumSha256, size, releaseTag, releaseAssetName }) => ({ key, checksumSha256, size, releaseTag, releaseAssetName });

function asset(key, data, releaseTag, releaseAssetName) {
  return { key, data, checksumSha256: sha256(data), size: data.length, releaseTag, releaseAssetName };
}

function jsonAsset(key, value, tagPrefix, name) {
  const data = Buffer.from(`${stableStringify(value)}\n`);
  return asset(key, data, `${tagPrefix}-${sha256(data).slice(0, 16)}`, name);
}

function requireHistory(existingCatalog, bundle) {
  if (!Array.isArray(existingCatalog?.sources) || !Array.isArray(existingCatalog?.partitions)) throw new Error("CHILECOMPRA_HISTORY_CATALOG_REQUIRED");
  const sources = existingCatalog.sources.filter(source => source.id === "chilecompra");
  if (sources.length !== 1) throw new Error("CHILECOMPRA_HISTORY_SOURCE_REQUIRED");
  const source = sources[0];
  const entities = bundle?.entities;
  const indexes = bundle?.indexes;
  if (!Number.isSafeInteger(source.entityCount) || source.entityCount < 1 || !source.entityKey || !source.entityIndexKey
    || !Array.isArray(entities) || !Array.isArray(indexes) || entities.length !== source.entityCount) {
    throw new Error("CHILECOMPRA_HISTORY_ENTITY_COUNT_MISMATCH");
  }
  const ids = new Set(entities.map(entity => entity.id));
  const indexIds = new Set(indexes.map(index => index.id));
  if (ids.size !== entities.length || indexIds.size !== indexes.length || indexIds.size !== ids.size
    || entities.some(entity => typeof entity.id !== "string" || !entity.id || !entity.sourceIds?.includes("chilecompra"))
    || indexes.some(index => !ids.has(index.id) || index.sourceId !== "chilecompra"
      || !Array.isArray(index.evidenceRecordIds) || !Array.isArray(index.relations)
      || index.evidenceRecordIds.some(id => typeof id !== "string" || !id.startsWith("chilecompra-"))
      || index.relations.some(relation => !ids.has(relation.fromId) || !ids.has(relation.toId)))) {
    throw new Error("CHILECOMPRA_HISTORY_INDEX_MISMATCH");
  }
  return source;
}

function verifyCandidate(files, expected) {
  for (const name of ["records", "manifest", "rejected"]) {
    if (!Buffer.isBuffer(files[name]) || files[name].length !== expected[name].size || sha256(files[name]) !== expected[name].sha256) {
      throw new Error(`CHILECOMPRA_CANDIDATE_ASSET_MISMATCH:${name}`);
    }
  }
  const manifest = JSON.parse(files.manifest.toString("utf8"));
  const [year, month] = expected.period.split("-");
  const id = `chilecompra/${year}/${month}`;
  const recordKey = `partitions/${id}/records-${expected.records.sha256}.jsonl.gz`;
  const rejectedKey = `originals/${id}/chilecompra-${expected.period}-rejected-documents.json`;
  const recordArtifact = manifest.artifacts?.[0];
  const rejectedArtifact = manifest.original?.artifacts?.find(item => item.key === rejectedKey);
  if (manifest.schemaVersion !== "1.0.0" || manifest.id !== id || manifest.sourceId !== "chilecompra"
    || manifest.year !== Number(year) || manifest.month !== Number(month) || manifest.sourcePeriod !== expected.period
    || manifest.recordCount !== expected.recordCount || manifest.status !== "partial" || manifest.variant != null
    || manifest.projectionChecksumSha256 !== expected.records.sha256
    || manifest.projectionUncompressedChecksumSha256 !== expected.uncompressedSha256
    || expected.releaseTag !== `data-chilecompra-${year}-${expected.manifest.sha256.slice(0, 16)}`
    || manifest.artifacts?.length !== 1 || recordArtifact?.key !== recordKey
    || recordArtifact.checksumSha256 !== expected.records.sha256 || recordArtifact.size !== expected.records.size
    || recordArtifact.releaseAssetName !== expected.records.name
    || !rejectedArtifact?.archived || rejectedArtifact.checksumSha256 !== expected.rejected.sha256 || rejectedArtifact.size !== expected.rejected.size
    || manifest.original.artifacts.some(item => item.archived && item.key !== rejectedKey)) {
    throw new Error("CHILECOMPRA_CANDIDATE_MANIFEST_MISMATCH");
  }
  const uncompressed = gunzipSync(files.records);
  if (sha256(uncompressed) !== expected.uncompressedSha256) throw new Error("CHILECOMPRA_CANDIDATE_UNCOMPRESSED_MISMATCH");
  const records = parseJsonl(uncompressed);
  if (records.length !== expected.recordCount || new Set(records.map(record => record.id)).size !== records.length
    || records.some(record => record.sourceId !== "chilecompra" || typeof record.id !== "string" || !record.id.startsWith("chilecompra-")
      || !record.data || typeof record.data.id !== "string" || record.data.source_period !== expected.period
      || record.occurredAt !== record.data.fecha || !Array.isArray(record.data.subject_entity_ids) || !Array.isArray(record.data.object_entity_ids))) {
    throw new Error("CHILECOMPRA_CANDIDATE_ROWS_INVALID");
  }
  const rejected = JSON.parse(files.rejected.toString("utf8"));
  if (!Array.isArray(rejected.documents) || rejected.count !== rejected.documents.length) throw new Error("CHILECOMPRA_CANDIDATE_REJECTED_INVALID");
  return { manifest, records, recordKey, rejectedKey, id, year };
}

/**
 * @typedef {{name: string, size: number, sha256: string}} AssetContract
 * @typedef {{period: string, recordCount: number, releaseTag: string, uncompressedSha256: string, records: AssetContract, manifest: AssetContract, rejected: AssetContract}} CandidateContract
 * @typedef {ReturnType<typeof buildLakePlan>["catalog"]} LakeCatalog
 * @typedef {{entities: Array<Record<string, unknown>>, indexes: Array<Record<string, unknown>>, years?: string[]}} EntityBundle
 */

/**
 * The expected override permits tiny unit fixtures; the CLI always uses JULY_CANDIDATE.
 * @param {{files: {records: Buffer, manifest: Buffer, rejected: Buffer}, existingCatalog: LakeCatalog, existingEntityBundle: EntityBundle, generatedAt: string, expected?: CandidateContract}} input
 */
export function buildChileCompraRestorePlan({ files, existingCatalog, existingEntityBundle, generatedAt, expected = JULY_CANDIDATE }) {
  const verified = verifyCandidate(files, expected);
  const { manifest, records, recordKey, rejectedKey, id, year } = verified;
  const previousSource = requireHistory(existingCatalog, existingEntityBundle);
  const previousTarget = existingCatalog.partitions.find(partition => partition.id === id);
  if (previousTarget && (previousTarget.checksumSha256 !== expected.records.sha256 || previousTarget.recordCount !== expected.recordCount)) {
    throw new Error("CHILECOMPRA_CANDIDATE_TARGET_CONFLICT");
  }
  const plan = buildLakePlan({ actualizado_en: generatedAt, fuentes: { chilecompra: records.map(record => record.data) } }, {
    sourceKeys: ["chilecompra"], existingCatalog, existingEntityBundles: { chilecompra: existingEntityBundle },
  });
  // Rebuild identities/indexes with the canonical official-ID rules, but retain
  // the exact archived record and partition-manifest bytes, not a re-extraction.
  const generatedRecords = plan.assets.find(item => item.key.startsWith(`partitions/${id}/records-`));
  const normalized = parseJsonl(gunzipSync(generatedRecords.data));
  const byId = new Map(normalized.map(record => [record.id, record]));
  if (normalized.length !== records.length || records.some(record => stableStringify(byId.get(record.id)) !== stableStringify(record))) {
    throw new Error("CHILECOMPRA_CANDIDATE_NORMALIZATION_MISMATCH");
  }
  const source = plan.catalog.sources.find(item => item.id === "chilecompra");
  const entities = parseJsonl(gunzipSync(plan.assets.find(item => item.key === source.entityKey).data));
  const entityIds = new Set(entities.map(entity => entity.id));
  if (existingEntityBundle.entities.some(entity => !entityIds.has(entity.id))
    || records.some(record => [...record.data.subject_entity_ids, ...record.data.object_entity_ids].some(entityId => !entityIds.has(entityId)))) {
    throw new Error("CHILECOMPRA_HISTORY_ENTITY_LOSS");
  }
  const restoredPartition = {
    id, sourceId: "chilecompra", variant: manifest.variant ?? null, period: expected.period, sourcePeriod: manifest.sourcePeriod,
    releaseTag: expected.releaseTag, manifestKey: `partitions/${id}/manifest.json`, manifestAssetName: expected.manifest.name,
    recordCount: manifest.recordCount, checksumSha256: manifest.projectionChecksumSha256, status: manifest.status,
  };
  // Do not let the builder's legacy source-period migration remove other months.
  const partitions = [...existingCatalog.partitions.filter(partition => partition.id !== id), restoredPartition].sort((a, b) => a.id.localeCompare(b.id));
  const sourcePartitions = partitions.filter(partition => partition.sourceId === "chilecompra");
  const mergedSource = {
    ...previousSource, status: manifest.status,
    foundPeriods: [...new Set([...(previousSource.foundPeriods ?? []), ...sourcePartitions.map(partition => partition.period)])].sort(),
    recordCount: sourcePartitions.reduce((sum, partition) => sum + partition.recordCount, 0),
    entityKey: source.entityKey, entityIndexKey: source.entityIndexKey, entityCount: source.entityCount,
  };
  const catalog = {
    ...existingCatalog, generatedAt,
    sources: existingCatalog.sources.map(item => item.id === "chilecompra" ? mergedSource : item), partitions,
  };
  const sourceManifest = {
    schemaVersion: "1.0.0", sourceId: "chilecompra", generatedAt, status: mergedSource.status,
    foundPeriods: mergedSource.foundPeriods, recordCount: mergedSource.recordCount,
    entityKey: source.entityKey, entityIndexKey: source.entityIndexKey, entityCount: source.entityCount,
    partitionCount: sourcePartitions.length,
    partitions: sourcePartitions.map(partition => ({
      id: partition.id, period: partition.period, sourcePeriod: partition.sourcePeriod ?? null,
      recordCount: partition.recordCount, checksumSha256: partition.checksumSha256, status: partition.status,
    })),
    coverage: previousSource.coverage ?? null, license: "CC0-1.0",
    restoration: { releaseTag: expected.releaseTag, manifestSha256: expected.manifest.sha256 },
  };
  const assets = plan.assets.filter(item => item.key === source.entityKey || item.key === source.entityIndexKey);
  assets.push(
    asset(recordKey, files.records, expected.releaseTag, expected.records.name),
    asset(restoredPartition.manifestKey, files.manifest, expected.releaseTag, expected.manifest.name),
    asset(rejectedKey, files.rejected, expected.releaseTag, expected.rejected.name),
    asset(`partitions/${id}/sha256.txt`, Buffer.from(`${expected.records.sha256}  ${recordKey.split("/").at(-1)}\n${expected.manifest.sha256}  manifest.json\n`), expected.releaseTag, `chilecompra-${expected.period}-sha256.txt`),
    jsonAsset("sources/chilecompra/manifest.json", sourceManifest, `data-chilecompra-${year}-manifest`, `chilecompra-${year}-source-manifest.json`),
    jsonAsset("catalog/v1/manifest.json", catalog, "data-catalog-v1", "manifest.json"),
  );
  return {
    catalog, assets,
    publishPlan: {
      schemaVersion: "1.0.0", generatedAt,
      restoration: { period: expected.period, recordCount: records.length, releaseTag: expected.releaseTag,
        manifestSha256: expected.manifest.sha256, baselineEntityCount: previousSource.entityCount, entityCount: source.entityCount },
      assets: assets.map(metadata),
    },
  };
}

function verifyHistoryArchive(data, key, kind) {
  const checksum = typeof key === "string" && key.match(kind === "entities"
    ? /^entities\/v1\/chilecompra-([a-f0-9]{64})\.jsonl\.gz$/u
    : /^indexes\/v1\/chilecompra\/entities-([a-f0-9]{64})\.jsonl\.gz$/u)?.[1];
  if (!checksum) throw new Error(`CHILECOMPRA_HISTORY_KEY_INVALID:${kind}`);
  if (!Buffer.isBuffer(data) || sha256(data) !== checksum) throw new Error(`CHILECOMPRA_HISTORY_CHECKSUM_MISMATCH:${kind}`);
  return parseJsonl(gunzipSync(data));
}

/** @param {{existingCatalog: LakeCatalog, entityArchive: Buffer, entityIndexArchive: Buffer}} input */
export function verifyChileCompraHistoryArchives({ existingCatalog, entityArchive, entityIndexArchive }) {
  const source = existingCatalog.sources?.find(item => item.id === "chilecompra");
  const bundle = {
    entities: verifyHistoryArchive(entityArchive, source?.entityKey, "entities"),
    indexes: verifyHistoryArchive(entityIndexArchive, source?.entityIndexKey, "indexes"),
    years: (existingCatalog.partitions ?? []).filter(partition => partition.sourceId === "chilecompra").map(partition => partition.period.slice(0, 4)),
  };
  requireHistory(existingCatalog, bundle);
  return bundle;
}

function main() {
  const args = process.argv.slice(2);
  const allowed = new Set(["--candidate-dir", "--base-entities", "--base-entity-index", "--lake-root", "--catalog"]);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!allowed.has(args[i]) || !args[i + 1] || args[i + 1].startsWith("--") || options[args[i]]) throw new Error(`CHILECOMPRA_RESTORE_ARGUMENT_INVALID:${args[i]}`);
    options[args[i]] = resolve(args[i + 1]);
  }
  for (const required of ["--candidate-dir", "--base-entities", "--base-entity-index", "--lake-root"]) {
    if (!options[required]) throw new Error(`CHILECOMPRA_RESTORE_ARGUMENT_REQUIRED:${required}`);
  }
  const outputRoot = options["--lake-root"];
  const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  if (outputRoot === appRoot || dirname(outputRoot) === outputRoot || appRoot.startsWith(`${outputRoot}${sep}`)) throw new Error("CHILECOMPRA_RESTORE_OUTPUT_INVALID");
  const existingCatalog = JSON.parse(readFileSync(options["--catalog"] ?? join(outputRoot, "catalog/v1/manifest.json"), "utf8"));
  const existingEntityBundle = verifyChileCompraHistoryArchives({
    existingCatalog,
    entityArchive: readFileSync(options["--base-entities"]),
    entityIndexArchive: readFileSync(options["--base-entity-index"]),
  });
  const files = Object.fromEntries(["records", "manifest", "rejected"].map(name => [name, readFileSync(join(options["--candidate-dir"], JULY_CANDIDATE[name].name))]));
  const plan = buildChileCompraRestorePlan({ files, existingCatalog, existingEntityBundle, generatedAt: new Date().toISOString() });
  for (const item of plan.assets) {
    const target = resolve(outputRoot, item.key);
    if (!target.startsWith(`${outputRoot}${sep}`)) throw new Error(`CHILECOMPRA_RESTORE_ASSET_KEY_INVALID:${item.key}`);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, item.data);
  }
  writeFileSync(join(outputRoot, "publish-plan.json"), `${JSON.stringify(plan.publishPlan, null, 2)}\n`);
  console.log(JSON.stringify({ mode: "local-restore-only", ...plan.publishPlan.restoration, assets: plan.assets.length, output: outputRoot }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
