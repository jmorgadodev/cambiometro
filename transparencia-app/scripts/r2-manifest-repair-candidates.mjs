import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

function text(value) {
  return String(value ?? "").trim();
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function periodOf(value) {
  const direct = text(value?.period ?? value?.sourcePeriod ?? value?.mes);
  if (/^\d{4}-\d{2}$/.test(direct)) return direct;
  const year = Number(value?.year);
  const month = Number(value?.month);
  return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12
    ? `${year}-${String(month).padStart(2, "0")}`
    : "";
}

function partitionKey(partition) {
  return text(partition?.manifestKey);
}

function expectedArtifactKey(partition) {
  const manifestKey = partitionKey(partition);
  const checksum = text(partition?.checksumSha256).toLowerCase();
  if (!manifestKey.endsWith("/manifest.json") || !/^[a-f0-9]{64}$/.test(checksum)) return null;
  return `${manifestKey.slice(0, -"manifest.json".length)}records-${checksum}.jsonl.gz`;
}

function reject(rejected, partition, reason, details = {}) {
  rejected.push({
    manifestKey: partitionKey(partition),
    partitionId: partition?.id ?? null,
    sourceId: partition?.sourceId ?? null,
    reason,
    ...details,
  });
}

/**
 * Compares missing remote manifests against local lake material without
 * uploading anything. A candidate is eligible only when period, row count,
 * projection checksum, artifact key and local artifact checksum all match the
 * remote catalog declaration.
 */
export function buildR2ManifestRepairCandidates({
  remoteCatalog,
  localLakeRoot,
  missingManifestKeys = [],
}) {
  const missing = new Set((missingManifestKeys ?? []).map(text).filter(Boolean));
  const candidates = [];
  const rejected = [];
  const partitions = Array.isArray(remoteCatalog?.partitions) ? remoteCatalog.partitions : [];

  for (const partition of partitions) {
    const manifestKey = partitionKey(partition);
    if (!missing.has(manifestKey)) continue;
    if (!manifestKey) {
      reject(rejected, partition, "manifest_key_missing");
      continue;
    }

    const manifestPath = join(localLakeRoot, manifestKey);
    if (!existsSync(manifestPath)) {
      reject(rejected, partition, "local_manifest_missing");
      continue;
    }

    let manifest;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch (error) {
      reject(rejected, partition, "local_manifest_invalid_json", { detail: String(error?.message ?? error) });
      continue;
    }

    const remotePeriod = periodOf(partition);
    const localPeriod = periodOf(manifest);
    if (!remotePeriod || localPeriod !== remotePeriod) {
      reject(rejected, partition, "period_mismatch", { remotePeriod, localPeriod });
      continue;
    }

    const remoteCount = Number(partition?.recordCount);
    const localCount = Number(manifest?.recordCount);
    if (!Number.isSafeInteger(remoteCount) || !Number.isSafeInteger(localCount) || remoteCount !== localCount) {
      reject(rejected, partition, "record_count_mismatch", { remoteCount, localCount });
      continue;
    }

    const remoteChecksum = text(partition?.checksumSha256).toLowerCase();
    const localChecksum = text(manifest?.projectionChecksumSha256 ?? manifest?.checksumSha256).toLowerCase();
    if (!remoteChecksum || localChecksum !== remoteChecksum) {
      reject(rejected, partition, "projection_checksum_mismatch", { remoteChecksum, localChecksum });
      continue;
    }

    const expectedKey = expectedArtifactKey(partition);
    const artifact = Array.isArray(manifest?.artifacts)
      ? manifest.artifacts.find((item) => text(item?.key) === expectedKey)
      : null;
    if (!expectedKey || !artifact) {
      reject(rejected, partition, "artifact_key_mismatch", { expectedKey, localArtifactKeys: (manifest?.artifacts ?? []).map((item) => text(item?.key)).filter(Boolean) });
      continue;
    }

    const artifactPath = join(localLakeRoot, expectedKey);
    if (!existsSync(artifactPath)) {
      reject(rejected, partition, "local_artifact_missing", { artifactKey: expectedKey });
      continue;
    }

    const actualArtifactChecksum = sha256(artifactPath);
    if (actualArtifactChecksum !== remoteChecksum) {
      reject(rejected, partition, "local_artifact_checksum_mismatch", {
        artifactKey: expectedKey,
        expectedChecksum: remoteChecksum,
        actualChecksum: actualArtifactChecksum,
      });
      continue;
    }

    candidates.push({
      manifestKey,
      partitionId: partition?.id ?? null,
      sourceId: partition?.sourceId ?? null,
      period: remotePeriod,
      recordCount: remoteCount,
      checksumSha256: remoteChecksum,
      manifestPath,
      artifactKey: expectedKey,
      artifactPath,
      artifactBytes: statSync(artifactPath).size,
      writesPerformed: false,
    });
  }

  return {
    schemaVersion: 1,
    requestedMissingManifests: missing.size,
    candidates,
    rejected,
    ready: missing.size > 0 && rejected.length === 0 && candidates.length === missing.size,
    writesPerformed: false,
    totalBytes: candidates.reduce((sum, candidate) => sum + candidate.artifactBytes + statSync(candidate.manifestPath).size, 0),
  };
}

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function readJson(file) {
  return JSON.parse(readFileSync(resolve(file), "utf8"));
}

if (process.argv[1]?.endsWith("r2-manifest-repair-candidates.mjs")) {
  const remoteCatalogPath = option("--remote-catalog");
  const missingPath = option("--missing-manifests");
  const lakeRoot = resolve(option("--lake-root", join(resolve(import.meta.dirname, ".."), "data", "lake")));
  if (!remoteCatalogPath || !missingPath) {
    throw new Error("Uso: node scripts/r2-manifest-repair-candidates.mjs --remote-catalog <catalog.json> --missing-manifests <closure.json> [--lake-root <path>]");
  }
  const closure = readJson(missingPath);
  const result = buildR2ManifestRepairCandidates({
    remoteCatalog: readJson(remoteCatalogPath),
    localLakeRoot: lakeRoot,
    missingManifestKeys: closure.missingManifests,
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ready) process.exitCode = 1;
}
